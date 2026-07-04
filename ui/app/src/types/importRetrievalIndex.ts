export type ImportSupportTier =
  | "mvp_first_class"
  | "mvp_compatibility_fallback"
  | "experimental_expansion"
  | "unsupported";

export interface ImportRetrievalIndexEntry {
  runAt: string;
  inputPath: string;
  filePath: string;
  kind: string;
  status: "imported" | "skipped" | "failed";
  message: string;
  sourceCategory?: "conversation" | "document";
  supportTier?: ImportSupportTier;
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
  artifactLabels?: string[];
  artifactPaths: string[];
  evidenceSources?: string[];
  nextAction?: "open_archive" | "open_dataset" | "review_outputs" | "open_source_file";
  nextActionLabel?: string;
}

export interface ImportRetrievalIndexManifest {
  schemaVersion: "import_retrieval_index.v1";
  generatedAt: string;
  outputRoot: string;
  runCount: number;
  entryCount: number;
  supportTiers: ImportSupportTier[];
  vendorSources: string[];
  topicHints: string[];
  startedAt?: string;
  endedAt?: string;
  runs: Array<{
    runAt: string;
    inputPath: string;
    retrievalSummary: {
      supportTiers: ImportSupportTier[];
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
