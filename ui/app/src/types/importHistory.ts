export interface ImportArtifact {
  label: string;
  path: string;
}

export interface ImportRunFileResult {
  path: string;
  kind: string;
  status: "imported" | "skipped" | "failed";
  message: string;
  artifacts?: ImportArtifact[];
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
  unsupportedFilesSkipped: number;
  artifacts: ImportArtifact[];
  results: ImportRunFileResult[];
}

export interface ImportHistoryResult {
  outputRoot: string;
  importsRoot: string;
  latestFile: string;
  historyDir: string;
  latest: ImportRunSummary | null;
  runs: ImportRunSummary[];
}
