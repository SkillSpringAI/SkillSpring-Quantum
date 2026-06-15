import path from "node:path";
import { promises as fs } from "node:fs";
import { spawn } from "node:child_process";
import { ensureDir, writeTextFile } from "../utils/fs.js";
import { resolveDesktopExportFolder, resolveOutputRoot } from "../utils/paths.js";

interface BatchResult {
  file: string;
  status: "success" | "failed";
  exit_code: number | null;
  stdout: string;
  stderr: string;
}

interface BatchReport {
  run_at: string;
  input_folder: string;
  output_root: string;
  files_attempted: number;
  files_succeeded: number;
  files_failed: number;
  results: BatchResult[];
}

function resolveTsxCli(repoRoot: string): string {
  return path.join(repoRoot, "node_modules", "tsx", "dist", "cli.mjs");
}

function runSingleFile(repoRoot: string, filePath: string, outputRoot: string): Promise<BatchResult> {
  return new Promise((resolve) => {
    const tsxCli = resolveTsxCli(repoRoot);

    const child = spawn(
      process.execPath,
      [tsxCli, "core/pipeline/pipeline.ts", filePath, outputRoot],
      {
        cwd: repoRoot,
        stdio: ["ignore", "pipe", "pipe"]
      }
    );

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      const text = data.toString();
      stdout += text;
      process.stdout.write(text);
    });

    child.stderr.on("data", (data) => {
      const text = data.toString();
      stderr += text;
      process.stderr.write(text);
    });

    child.on("error", (error) => {
      stderr += error.message;
      resolve({
        file: filePath,
        status: "failed",
        exit_code: -1,
        stdout,
        stderr
      });
    });

    child.on("close", (code) => {
      resolve({
        file: filePath,
        status: code === 0 ? "success" : "failed",
        exit_code: code,
        stdout,
        stderr
      });
    });
  });
}

async function main(): Promise<void> {
  const inputFolder = process.argv[2] || resolveDesktopExportFolder();
  const outputRoot = resolveOutputRoot(process.argv[3]);
  const repoRoot = process.cwd();

  const tsxCli = resolveTsxCli(repoRoot);
  try {
    await fs.access(tsxCli);
  } catch {
    console.error("tsx CLI not found at:", tsxCli);
    console.error("Run: npm install");
    process.exit(1);
  }

  const entries = await fs.readdir(inputFolder, { withFileTypes: true });
  const shardFiles = entries
    .filter((e) => e.isFile() && /^conversations-\d+\.json$/i.test(e.name))
    .map((e) => path.join(inputFolder, e.name))
    .sort();

  if (shardFiles.length === 0) {
    console.error("No conversation shard files found in:", inputFolder);
    process.exit(1);
  }

  const results: BatchResult[] = [];

  for (const file of shardFiles) {
    console.log("Batch processing:", file);
    const result = await runSingleFile(repoRoot, file, outputRoot);
    results.push(result);
  }

  const report: BatchReport = {
    run_at: new Date().toISOString(),
    input_folder: inputFolder,
    output_root: outputRoot,
    files_attempted: results.length,
    files_succeeded: results.filter(r => r.status === "success").length,
    files_failed: results.filter(r => r.status === "failed").length,
    results
  };

  const reportPath = path.join(outputRoot, "diagnostics", "batch-run-report.json");
  await ensureDir(path.dirname(reportPath));
  await writeTextFile(reportPath, JSON.stringify(report, null, 2));

  console.log("Batch run complete.");
  console.log({
    filesAttempted: report.files_attempted,
    filesSucceeded: report.files_succeeded,
    filesFailed: report.files_failed,
    reportPath
  });

  if (report.files_failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Batch runner failed:", error);
  process.exit(1);
});
