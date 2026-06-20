import type { DatasetRunResult } from "../types/datasetRun";

export interface DatasetInvestigationIntent {
  vendor?: string;
  topic?: string;
  createdAt?: string;
}

export function findMatchingDatasetRun(
  runs: DatasetRunResult["runs"],
  intent: DatasetInvestigationIntent
): DatasetRunResult["runs"][number] | null {
  const normalizedVendor = intent.vendor?.trim().toLowerCase() ?? "";
  const normalizedTopic = intent.topic?.trim().toLowerCase() ?? "";

  const scoredRuns = runs.map((run) => {
    let score = 0;
    const sourceContext = run.source_context;

    if (normalizedVendor && sourceContext?.vendor_sources.some((vendor) => vendor.toLowerCase() === normalizedVendor)) {
      score += 3;
    }

    if (normalizedTopic && sourceContext?.topic_hints.some((topic) => topic.toLowerCase().includes(normalizedTopic))) {
      score += 2;
    }

    return { run, score };
  });

  scoredRuns.sort((left, right) => right.score - left.score || right.run.run_id.localeCompare(left.run.run_id));
  return scoredRuns[0]?.score ? scoredRuns[0].run : runs[0] ?? null;
}
