import path from "node:path";
import { promises as fs } from "node:fs";
import { fileExists } from "../utils/fs.js";
import { resolveOutputRoot } from "../utils/paths.js";
import { filterImportRunResults, filterImportRuns, type ImportHistoryFilters } from "./filterImportHistory.js";
import type { ImportRunSummary } from "./sourceIntake.js";

interface QueryImportHistoryResult {
  outputRoot: string;
  importsRoot: string;
  historyDir: string;
  filters: ImportHistoryFilters;
  runs: ImportRunSummary[];
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  return JSON.parse(await fs.readFile(filePath, "utf-8")) as T;
}

async function main(): Promise<void> {
  const outputRoot = resolveOutputRoot(process.argv[2]);
  const filters = parseFilterArgs(process.argv.slice(3));
  const importsRoot = path.join(outputRoot, "imports");
  const historyDir = path.join(importsRoot, "history");

  const runs: ImportRunSummary[] = [];

  if (await fileExists(historyDir)) {
    const entries = await fs.readdir(historyDir, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile() && /^import-run-.*\.json$/i.test(entry.name))
      .map((entry) => path.join(historyDir, entry.name))
      .sort()
      .reverse();

    for (const filePath of files) {
      runs.push(await readJsonFile<ImportRunSummary>(filePath));
    }
  }

  const filteredRuns = filterImportRuns(runs, filters).map((run) => ({
    ...run,
    results: filterImportRunResults(run.results, filters)
  }));

  const result: QueryImportHistoryResult = {
    outputRoot,
    importsRoot,
    historyDir,
    filters,
    runs: filteredRuns
  };

  console.log(JSON.stringify(result, null, 2));
}

function parseFilterArgs(args: string[]): ImportHistoryFilters {
  const filters: ImportHistoryFilters = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];

    switch (arg) {
      case "--vendor":
        filters.vendor = next;
        index += 1;
        break;
      case "--topic":
        filters.topic = next;
        index += 1;
        break;
      case "--text":
        filters.text = next;
        index += 1;
        break;
      case "--from":
        filters.from = next;
        index += 1;
        break;
      case "--to":
        filters.to = next;
        index += 1;
        break;
      case "--status":
        filters.status = (next as ImportHistoryFilters["status"]) ?? "all";
        index += 1;
        break;
      default:
        break;
    }
  }

  return filters;
}

main().catch((error) => {
  console.error("Query import history failed:", error);
  process.exit(1);
});
