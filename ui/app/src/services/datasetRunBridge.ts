import type { DatasetRunResult } from "../types/datasetRun";
import { readLatestDatasetRun } from "./desktopBridge";

export async function loadLatestDatasetRun(
  outputRoot = "organized_output"
): Promise<DatasetRunResult> {
  const response = await readLatestDatasetRun({ outputRoot });

  if (!response.ok) {
    return {
      outputRoot,
      datasetsRoot: outputRoot + "/datasets",
      manifestPath: outputRoot + "/db/manifests/latest-dataset-run.json",
      latest: null
    };
  }

  return response.result as DatasetRunResult;
}
