export interface MarkdownArchiveFile {
  name: string;
  path: string;
  topicFolder: string;
  sizeBytes: number;
  modifiedAt: string;
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
