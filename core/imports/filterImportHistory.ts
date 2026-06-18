import type { ImportRunFileResult, ImportRunSummary } from "./sourceIntake.js";

export interface ImportHistoryFilters {
  vendor?: string;
  topic?: string;
  text?: string;
  from?: string;
  to?: string;
  status?: ImportRunFileResult["status"] | "all";
}

export function filterImportRuns(
  runs: ImportRunSummary[],
  filters: ImportHistoryFilters
): ImportRunSummary[] {
  return runs.filter((run) => matchesRunFilters(run, filters));
}

export function filterImportRunResults(
  results: ImportRunFileResult[],
  filters: ImportHistoryFilters
): ImportRunFileResult[] {
  return results.filter((result) => matchesResultFilters(result, filters));
}

export function matchesRunFilters(
  run: ImportRunSummary,
  filters: ImportHistoryFilters
): boolean {
  const query = normalizeQuery(filters.text);
  const vendor = normalizeQuery(filters.vendor);
  const topic = normalizeQuery(filters.topic);
  const from = normalizeDate(filters.from);
  const to = normalizeDate(filters.to);

  if (vendor) {
    const runVendors = run.retrievalSummary?.vendorSources ?? [];
    if (!runVendors.some((value) => value.toLowerCase() === vendor)) {
      return false;
    }
  }

  if (topic) {
    const runTopics = run.retrievalSummary?.topicHints ?? [];
    if (!runTopics.some((value) => value.toLowerCase().includes(topic))) {
      return false;
    }
  }

  if (query) {
    const haystack = [
      run.inputPath,
      ...(run.retrievalSummary?.vendorSources ?? []),
      ...(run.retrievalSummary?.topicHints ?? []),
      ...run.results.map((result) => result.path),
      ...run.results.map((result) => result.message)
    ]
      .join(" ")
      .toLowerCase();

    if (!haystack.includes(query)) {
      return false;
    }
  }

  if (from || to) {
    const rangeStart = normalizeDate(run.retrievalSummary?.startedAt) ?? normalizeDate(run.runAt);
    const rangeEnd = normalizeDate(run.retrievalSummary?.endedAt) ?? normalizeDate(run.runAt);

    if (!rangeIntersects(rangeStart, rangeEnd, from, to)) {
      return false;
    }
  }

  if (filters.status && filters.status !== "all") {
    if (!run.results.some((result) => result.status === filters.status)) {
      return false;
    }
  }

  return true;
}

export function matchesResultFilters(
  result: ImportRunFileResult,
  filters: ImportHistoryFilters
): boolean {
  const query = normalizeQuery(filters.text);
  const vendor = normalizeQuery(filters.vendor);
  const topic = normalizeQuery(filters.topic);

  if (filters.status && filters.status !== "all" && result.status !== filters.status) {
    return false;
  }

  if (query) {
    const haystack = [result.path, result.message, result.kind].join(" ").toLowerCase();
    if (!haystack.includes(query)) {
      return false;
    }
  }

  if (result.metadata?.sourceCategory === "conversation") {
    if (vendor && !result.metadata.vendorSources.some((value) => value.toLowerCase() === vendor)) {
      return false;
    }

    if (topic && !result.metadata.topicHints.some((value) => value.toLowerCase().includes(topic))) {
      return false;
    }

    if (filters.from || filters.to) {
      const start = normalizeDate(result.metadata.startedAt);
      const end = normalizeDate(result.metadata.endedAt);
      if (!rangeIntersects(start, end, normalizeDate(filters.from), normalizeDate(filters.to))) {
        return false;
      }
    }
  } else {
    if (vendor || topic || filters.from || filters.to) {
      return false;
    }
  }

  return true;
}

function normalizeQuery(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function normalizeDate(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function rangeIntersects(
  start: number | null,
  end: number | null,
  filterStart: number | null,
  filterEnd: number | null
): boolean {
  if (filterStart === null && filterEnd === null) {
    return true;
  }

  const effectiveStart = start ?? end;
  const effectiveEnd = end ?? start;
  if (effectiveStart === null && effectiveEnd === null) {
    return false;
  }

  const candidateStart = effectiveStart ?? effectiveEnd ?? 0;
  const candidateEnd = effectiveEnd ?? effectiveStart ?? candidateStart;

  if (filterStart !== null && candidateEnd < filterStart) {
    return false;
  }

  if (filterEnd !== null && candidateStart > filterEnd) {
    return false;
  }

  return true;
}
