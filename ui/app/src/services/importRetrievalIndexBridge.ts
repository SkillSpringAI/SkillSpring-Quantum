import type { ImportRetrievalIndexResult } from "../types/importRetrievalIndex";
import { readImportRetrievalIndex } from "./desktopBridge";

export async function loadImportRetrievalIndex(
  outputRoot = "organized_output"
): Promise<ImportRetrievalIndexResult> {
  const response = await readImportRetrievalIndex({ outputRoot });

  if (!response.ok) {
    return {
      outputRoot,
      importsRoot: outputRoot + "/imports",
      latestFile: outputRoot + "/imports/latest-retrieval-index.json",
      latest: null
    };
  }

  return response.result as ImportRetrievalIndexResult;
}
