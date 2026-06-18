export interface SegmentRetrievalIndexEntry {
  runId: string;
  conversationId: string;
  source: string;
  title?: string;
  topic: string;
  rawTopic: string;
  createdAt?: string;
  startIndex: number;
  endIndex: number;
  messageCount: number;
  signalTier: string;
  signalScore: number;
  redactionCount: number;
  textPreview: string;
  text: string;
  artifactPaths: string[];
  searchText: string;
}

export interface SegmentRetrievalIndexManifest {
  schemaVersion: "segment_retrieval_index.v1";
  generatedAt: string;
  outputRoot: string;
  runCount: number;
  entryCount: number;
  topics: string[];
  sources: string[];
  startedAt?: string;
  endedAt?: string;
  entries: SegmentRetrievalIndexEntry[];
}

export interface SegmentRetrievalIndexResult {
  outputRoot: string;
  retrievalRoot: string;
  latestFile: string;
  latest: SegmentRetrievalIndexManifest | null;
}
