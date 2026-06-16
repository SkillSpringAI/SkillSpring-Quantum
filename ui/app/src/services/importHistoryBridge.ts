import type { ImportHistoryResult } from "../types/importHistory";
import { readImportHistory } from "./desktopBridge";

export async function loadImportHistory(
  outputRoot = "organized_output",
  limit = 8
): Promise<ImportHistoryResult> {
  const response = await readImportHistory({
    outputRoot,
    limit
  });

  if (!response.ok) {
    return {
      outputRoot,
      importsRoot: outputRoot + "/imports",
      latestFile: outputRoot + "/imports/latest-import-run.json",
      historyDir: outputRoot + "/imports/history",
      latest: null,
      runs: []
    };
  }

  return response.result as ImportHistoryResult;
}
