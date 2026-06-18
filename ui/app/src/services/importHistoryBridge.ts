import type { ImportHistoryFilters, ImportHistoryResult, ImportRunSummary } from "../types/importHistory";
import { queryImportHistory, readImportHistory } from "./desktopBridge";

interface QueryImportHistoryResult {
  outputRoot: string;
  importsRoot: string;
  historyDir: string;
  filters: Partial<ImportHistoryFilters>;
  runs: ImportRunSummary[];
}

function emptyHistoryResult(outputRoot: string): ImportHistoryResult {
  return {
    outputRoot,
    importsRoot: outputRoot + "/imports",
    latestFile: outputRoot + "/imports/latest-import-run.json",
    historyDir: outputRoot + "/imports/history",
    latest: null,
    runs: []
  };
}

export async function loadImportHistory(
  outputRoot = "organized_output",
  limit = 8
): Promise<ImportHistoryResult> {
  const response = await readImportHistory({
    outputRoot,
    limit
  });

  if (!response.ok) {
    return emptyHistoryResult(outputRoot);
  }

  return response.result as ImportHistoryResult;
}

export async function searchImportHistory(
  outputRoot = "organized_output",
  filters: ImportHistoryFilters
): Promise<ImportHistoryResult> {
  const normalizedFilters: Partial<ImportHistoryFilters> = {};

  if (filters.vendor.trim()) normalizedFilters.vendor = filters.vendor.trim();
  if (filters.topic.trim()) normalizedFilters.topic = filters.topic.trim();
  if (filters.text.trim()) normalizedFilters.text = filters.text.trim();
  if (filters.from) normalizedFilters.from = filters.from;
  if (filters.to) normalizedFilters.to = filters.to;
  if (filters.status !== "all") normalizedFilters.status = filters.status;

  const response = await queryImportHistory({
    outputRoot,
    ...normalizedFilters
  });

  if (!response.ok) {
    return emptyHistoryResult(outputRoot);
  }

  const result = response.result as QueryImportHistoryResult;
  return {
    outputRoot: result.outputRoot,
    importsRoot: result.importsRoot,
    latestFile: result.importsRoot + "/latest-import-run.json",
    historyDir: result.historyDir,
    latest: result.runs[0] ?? null,
    runs: result.runs
  };
}
