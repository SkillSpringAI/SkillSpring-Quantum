export interface ImportRetrievalIndexEntry {
  runAt: string;
  inputPath: string;
  filePath: string;
  kind: string;
  status: "imported" | "skipped" | "failed";
  message: string;
  sourceCategory?: "conversation" | "document";
  conversationIds: string[];
  vendorSources: string[];
  titleHints: string[];
  topicHints: string[];
  searchText: string;
  startedAt?: string;
  endedAt?: string;
  conversationCount?: number;
  messageCount?: number;
  attachmentCount?: number;
  artifactPaths: string[];
}

export interface ImportRetrievalIndexManifest {
  schemaVersion: "import_retrieval_index.v1";
  generatedAt: string;
  outputRoot: string;
  runCount: number;
  entryCount: number;
  vendorSources: string[];
  topicHints: string[];
  startedAt?: string;
  endedAt?: string;
  runs: Array<{
    runAt: string;
    inputPath: string;
    retrievalSummary: {
      vendorSources: string[];
      topicHints: string[];
      startedAt?: string;
      endedAt?: string;
      conversationFiles: number;
      conversationCount: number;
      messageCount: number;
      attachmentCount: number;
    } | null;
  }>;
  entries: ImportRetrievalIndexEntry[];
}

export interface ImportRetrievalIndexResult {
  outputRoot: string;
  importsRoot: string;
  latestFile: string;
  latest: ImportRetrievalIndexManifest | null;
}
