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

function normalizeRun(run: ImportRunSummary): ImportRunSummary {
  return {
    ...run,
    artifacts: Array.isArray(run.artifacts) ? run.artifacts : [],
    results: Array.isArray(run.results) ? run.results : [],
    retrievalSummary: run.retrievalSummary
      ? {
          ...run.retrievalSummary,
          supportTiers: Array.isArray(run.retrievalSummary.supportTiers) ? run.retrievalSummary.supportTiers : [],
          vendorSources: Array.isArray(run.retrievalSummary.vendorSources) ? run.retrievalSummary.vendorSources : [],
          topicHints: Array.isArray(run.retrievalSummary.topicHints) ? run.retrievalSummary.topicHints : []
        }
      : null
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

  const result = response.result as Partial<ImportHistoryResult>;
  const runs = Array.isArray(result.runs) ? result.runs.map((run) => normalizeRun(run)) : [];
  return {
    outputRoot: result.outputRoot ?? outputRoot,
    importsRoot: result.importsRoot ?? outputRoot + "/imports",
    latestFile: result.latestFile ?? outputRoot + "/imports/latest-import-run.json",
    historyDir: result.historyDir ?? outputRoot + "/imports/history",
    latest: result.latest ? normalizeRun(result.latest) : runs[0] ?? null,
    runs
  };
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
  const runs = Array.isArray(result.runs) ? result.runs.map((run) => normalizeRun(run)) : [];
  return {
    outputRoot: result.outputRoot ?? outputRoot,
    importsRoot: result.importsRoot ?? outputRoot + "/imports",
    latestFile: (result.importsRoot ?? outputRoot + "/imports") + "/latest-import-run.json",
    historyDir: result.historyDir ?? outputRoot + "/imports/history",
    latest: runs[0] ?? null,
    runs
  };
}
