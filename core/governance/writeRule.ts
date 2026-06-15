import path from "node:path";
import { promises as fs } from "node:fs";
import { spawn } from "node:child_process";
import {
  governanceRulesRoot,
  backupGovernanceRuleFile,
  writeGovernanceRuleFile
} from "./fsRules.js";
import { writeGovernanceWriteReport } from "./writeReport.js";

function resolveRequestedPath(rawArg?: string): string {
  if (!rawArg) {
    throw new Error("Usage: npm run governance:write -- <filePath> <rawJsonText>");
  }

  if (path.isAbsolute(rawArg)) {
    return rawArg;
  }

  return path.join(governanceRulesRoot(), rawArg);
}

async function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");

    process.stdin.on("data", (chunk) => {
      data += chunk;
    });

    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}

async function parseArgs(argv: string[]): Promise<{ filePath: string; rawText: string }> {
  const args = argv.slice(2);

  if (args.length < 2) {
    throw new Error(
      "Usage:\n" +
      '  npm run governance:write -- <filePath> <rawJsonText>\n' +
      '  npm run governance:write -- <filePath> --from-file <jsonFilePath>\n' +
      '  Get-Content <jsonFilePath> -Raw | npm run governance:write -- <filePath> --stdin'
    );
  }

  const filePath = resolveRequestedPath(args[0]);

  if (args[1] === "--from-file") {
    if (!args[2]) {
      throw new Error("Missing JSON file path after --from-file");
    }

    const sourcePath = path.resolve(args[2]);
    const rawText = await fs.readFile(sourcePath, "utf-8");
    return { filePath, rawText };
  }

  if (args[1] === "--stdin") {
    const rawText = await readStdin();
    return { filePath, rawText };
  }

  const rawText = args.slice(1).join(" ");
  return { filePath, rawText };
}

function resolveTsxCli(repoRoot: string): string {
  return path.join(repoRoot, "node_modules", "tsx", "dist", "cli.mjs");
}

async function maybeRunDiagnostics(): Promise<boolean> {
  return new Promise(async (resolve) => {
    try {
      const repoRoot = process.cwd();
      const tsxCli = resolveTsxCli(repoRoot);

      await fs.access(tsxCli);

      const child = spawn(
        process.execPath,
        [tsxCli, "core/diagnostics/diagRunner.ts", "organized_output"],
        {
          cwd: repoRoot,
          stdio: ["ignore", "pipe", "pipe"]
        }
      );

      let settled = false;

      child.on("error", () => {
        if (!settled) {
          settled = true;
          resolve(false);
        }
      });

      child.on("close", (code) => {
        if (!settled) {
          settled = true;
          resolve(code === 0);
        }
      });
    } catch {
      resolve(false);
    }
  });
}

async function main(): Promise<void> {
  const { filePath, rawText } = await parseArgs(process.argv);

  const backupPath = await backupGovernanceRuleFile(filePath);
  const bytesWritten = await writeGovernanceRuleFile(filePath, rawText);
  const diagnosticsTriggered = await maybeRunDiagnostics();

  const report = {
    written_at: new Date().toISOString(),
    file_path: filePath,
    backup_path: backupPath,
    bytes_written: bytesWritten,
    diagnostics_triggered: diagnosticsTriggered
  };

  const reportPath = await writeGovernanceWriteReport(report);

  console.log(JSON.stringify({
    filePath,
    saved: true,
    backupPath,
    bytesWritten,
    diagnosticsTriggered,
    reportPath
  }, null, 2));
}

main().catch((error) => {
  console.error("Governance write rule failed:", error);
  process.exit(1);
});
