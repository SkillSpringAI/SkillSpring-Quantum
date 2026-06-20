import path from "node:path";
import { promises as fs } from "node:fs";
import { fileExists } from "../utils/fs.js";
import { resolveOutputRoot } from "../utils/paths.js";

interface ImportRunFileResult {
  path: string;
  kind: string;
  status: "imported" | "skipped" | "failed";
  message: string;
  metadata?: unknown;
}

interface ImportRunRetrievalSummary {
  vendorSources: string[];
  topicHints: string[];
  startedAt?: string;
  endedAt?: string;
  conversationFiles: number;
  conversationCount: number;
  messageCount: number;
  attachmentCount: number;
}

interface ImportRunSummary {
  runAt: string;
  inputPath: string;
  outputRoot: string;
  historyPath?: string;
  filesDiscovered: number;
  filesImported: number;
  filesFailed: number;
  conversationFilesProcessed: number;
  genericDocumentsProcessed: number;
  pdfFilesArchived: number;
  archivedOnlyFiles?: number;
  recoveryPathFiles?: number;
  unsupportedFilesSkipped: number;
  results: ImportRunFileResult[];
  retrievalSummary: ImportRunRetrievalSummary | null;
}

interface ImportHistoryResult {
  outputRoot: string;
  importsRoot: string;
  latestFile: string;
  historyDir: string;
  latest: ImportRunSummary | null;
  runs: ImportRunSummary[];
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  return JSON.parse(await fs.readFile(filePath, "utf-8")) as T;
}

async function main(): Promise<void> {
  const outputRoot = resolveOutputRoot(process.argv[2]);
  const limit = Number(process.argv[3] || 10);
  const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : 10;
  const importsRoot = path.join(outputRoot, "imports");
  const latestFile = path.join(importsRoot, "latest-import-run.json");
  const historyDir = path.join(importsRoot, "history");

  let latest: ImportRunSummary | null = null;
  const runs: ImportRunSummary[] = [];

  if (await fileExists(latestFile)) {
    latest = await readJsonFile<ImportRunSummary>(latestFile);
  }

  if (await fileExists(historyDir)) {
    const entries = await fs.readdir(historyDir, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile() && /^import-run-.*\.json$/i.test(entry.name))
      .map((entry) => path.join(historyDir, entry.name))
      .sort()
      .reverse()
      .slice(0, safeLimit);

    for (const filePath of files) {
      runs.push(await readJsonFile<ImportRunSummary>(filePath));
    }
  }

  if (!latest) {
    latest = runs[0] ?? null;
  }

  const result: ImportHistoryResult = {
    outputRoot,
    importsRoot,
    latestFile,
    historyDir,
    latest,
    runs
  };

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error("Read import history failed:", error);
  process.exit(1);
});
