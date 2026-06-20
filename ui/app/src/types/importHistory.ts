export type ImportSupportTier =
  | "mvp_first_class"
  | "mvp_compatibility_fallback"
  | "experimental_expansion"
  | "unsupported";

export interface ImportArtifact {
  label: string;
  path: string;
}

export interface ConversationImportMetadata {
  sourceCategory: "conversation";
  detectedKind: string;
  detectedLabel: string;
  supportTier: ImportSupportTier;
  vendorSources: string[];
  conversationCount: number;
  messageCount: number;
  participantCount: number;
  attachmentCount: number;
  startedAt?: string;
  endedAt?: string;
  sampleTitles: string[];
  topicHints: string[];
}

export interface DocumentImportMetadata {
  sourceCategory: "document";
  sourceKind: string;
  supportTier: ImportSupportTier;
  fileExtension: string;
  sizeBytes: number;
  parseStatus: "text_extracted" | "binary_archived_only";
  textLength: number;
}

export type ImportFileMetadata = ConversationImportMetadata | DocumentImportMetadata;

export interface ImportRunFileResult {
  path: string;
  kind: string;
  status: "imported" | "skipped" | "failed";
  message: string;
  artifacts?: ImportArtifact[];
  metadata?: ImportFileMetadata;
}

export interface ImportRunRetrievalSummary {
  supportTiers: ImportSupportTier[];
  vendorSources: string[];
  topicHints: string[];
  startedAt?: string;
  endedAt?: string;
  conversationFiles: number;
  conversationCount: number;
  messageCount: number;
  attachmentCount: number;
}

export interface ImportRunSummary {
  runAt: string;
  inputPath: string;
  outputRoot: string;
  historyPath?: string;
  filesDiscovered: number;
  filesImported: number;
  filesFailed: number;
  conversationFilesProcessed: number;
  genericDocumentsProcessed: number;
  pdfFilesArchived: number;
  archivedOnlyFiles?: number;
  recoveryPathFiles?: number;
  unsupportedFilesSkipped: number;
  artifacts: ImportArtifact[];
  results: ImportRunFileResult[];
  retrievalSummary: ImportRunRetrievalSummary | null;
}

export interface ImportHistoryResult {
  outputRoot: string;
  importsRoot: string;
  latestFile: string;
  historyDir: string;
  latest: ImportRunSummary | null;
  runs: ImportRunSummary[];
}

export interface ImportHistoryFilters {
  vendor: string;
  topic: string;
  text: string;
  from: string;
  to: string;
  status: "all" | "imported" | "skipped" | "failed";
}
