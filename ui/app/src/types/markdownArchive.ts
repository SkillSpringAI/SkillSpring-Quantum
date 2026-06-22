export interface MarkdownArchiveAttachment {
  id: string;
  label: string;
  mimeType?: string;
  archivePath?: string;
  previewPath?: string;
  resolvedArchivePath?: string;
  resolvedPreviewPath?: string;
  status: "preserved" | "preview_only" | "referenced_only";
}

export interface MarkdownArchiveFile {
  name: string;
  path: string;
  topicFolder: string;
  sizeBytes: number;
  modifiedAt: string;
  previewText: string;
  source?: string;
  title?: string;
  createdAt?: string;
  topic?: string;
  rawTopic?: string;
  conversationId?: string;
  startIndex?: number;
  endIndex?: number;
  supportTier?: "mvp_first_class" | "compatibility_fallback" | "unknown";
  hasAttachmentReferences?: boolean;
  hasPreservedAttachments?: boolean;
  hasMissingAttachments?: boolean;
  attachments?: MarkdownArchiveAttachment[];
}

export interface MarkdownArchiveTopic {
  name: string;
  path: string;
  fileCount: number;
  files: MarkdownArchiveFile[];
}

export interface AttachmentArchiveSummary {
  vendor: "grok" | "gemini";
  attachmentsReferenced: number;
  attachmentsArchived: number;
  attachmentsMissing: number;
  manifestPath: string;
  archiveRoot: string;
}

export interface MarkdownArchiveResult {
  outputRoot: string;
  topics: MarkdownArchiveTopic[];
  selectedFile: MarkdownArchiveFile | null;
  content: string;
  attachmentSummaries: AttachmentArchiveSummary[];
}
