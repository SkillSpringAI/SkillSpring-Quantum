export interface RetrievalSavedViewFilters {
  text: string;
  vendor: string;
  topic: string;
  status: "all" | "imported" | "skipped" | "failed";
  from: string;
  to: string;
}

export interface RetrievalSavedRecordSelection {
  runAt: string;
  filePath: string;
}

export interface RetrievalSavedSegmentSelection {
  runId: string;
  conversationId: string;
  startIndex: number;
  endIndex: number;
}

export interface RetrievalSavedViewEntry {
  id: string;
  name: string;
  filters: RetrievalSavedViewFilters;
  selectedRecord?: RetrievalSavedRecordSelection;
  selectedSegment?: RetrievalSavedSegmentSelection;
  createdAt: string;
  updatedAt: string;
}

export interface RetrievalSavedViewsManifest {
  schemaVersion: "retrieval_saved_views.v1";
  updatedAt: string;
  outputRoot: string;
  views: RetrievalSavedViewEntry[];
}

export interface RetrievalSavedViewsResult {
  outputRoot: string;
  retrievalRoot: string;
  latestFile: string;
  latest: RetrievalSavedViewsManifest | null;
}
