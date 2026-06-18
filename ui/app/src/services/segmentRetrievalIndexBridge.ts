import type { SegmentRetrievalIndexResult } from "../types/segmentRetrievalIndex";
import { readSegmentRetrievalIndex } from "./desktopBridge";

export async function loadSegmentRetrievalIndex(
  outputRoot = "organized_output"
): Promise<SegmentRetrievalIndexResult> {
  const response = await readSegmentRetrievalIndex({ outputRoot });

  if (!response.ok) {
    return {
      outputRoot,
      retrievalRoot: outputRoot + "/retrieval",
      latestFile: outputRoot + "/retrieval/latest-segment-index.json",
      latest: null
    };
  }

  return response.result as SegmentRetrievalIndexResult;
}
