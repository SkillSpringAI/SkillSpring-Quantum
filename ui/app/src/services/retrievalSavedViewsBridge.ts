import type {
  RetrievalSavedRecordSelection,
  RetrievalSavedSegmentSelection,
  RetrievalSavedViewsResult,
  RetrievalSavedViewFilters
} from "../types/retrievalSavedViews";
import {
  deleteRetrievalSavedView,
  readRetrievalSavedViews,
  saveRetrievalSavedView
} from "./desktopBridge";

export async function loadRetrievalSavedViews(
  outputRoot = "organized_output"
): Promise<RetrievalSavedViewsResult> {
  const response = await readRetrievalSavedViews({ outputRoot });

  if (!response.ok) {
    return {
      outputRoot,
      retrievalRoot: outputRoot + "/retrieval",
      latestFile: outputRoot + "/retrieval/saved-views.json",
      latest: null
    };
  }

  return response.result as RetrievalSavedViewsResult;
}

export async function storeRetrievalSavedView(
  outputRoot: string,
  name: string,
  filters: RetrievalSavedViewFilters,
  selectedRecord?: RetrievalSavedRecordSelection,
  selectedSegment?: RetrievalSavedSegmentSelection
): Promise<RetrievalSavedViewsResult> {
  const response = await saveRetrievalSavedView({
    outputRoot,
    name,
    filters,
    selectedRecord,
    selectedSegment
  });

  if (!response.ok) {
    return loadRetrievalSavedViews(outputRoot);
  }

  return response.result as RetrievalSavedViewsResult;
}

export async function removeRetrievalSavedView(
  outputRoot: string,
  id: string
): Promise<RetrievalSavedViewsResult> {
  const response = await deleteRetrievalSavedView({ outputRoot, id });

  if (!response.ok) {
    return loadRetrievalSavedViews(outputRoot);
  }

  return response.result as RetrievalSavedViewsResult;
}
