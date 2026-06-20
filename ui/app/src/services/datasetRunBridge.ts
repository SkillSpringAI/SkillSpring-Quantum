import type { DatasetRunResult } from "../types/datasetRun";
import { readLatestDatasetRun } from "./desktopBridge";

export async function loadLatestDatasetRun(
  outputRoot = "organized_output",
  limit = 8
): Promise<DatasetRunResult> {
  const response = await readLatestDatasetRun({ outputRoot, limit });

  if (!response.ok) {
    return {
      outputRoot,
      datasetsRoot: outputRoot + "/datasets",
      manifestPath: outputRoot + "/db/manifests/latest-dataset-run.json",
      latest: null,
      runs: []
    };
  }

  return response.result as DatasetRunResult;
}
