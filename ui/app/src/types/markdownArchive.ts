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

export interface MarkdownArchiveResult {
  outputRoot: string;
  topics: MarkdownArchiveTopic[];
  selectedFile: MarkdownArchiveFile | null;
  content: string;
}
