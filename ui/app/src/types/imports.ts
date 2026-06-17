export type ImportMode = "single_file" | "batch";

export type RunState = "idle" | "running" | "success" | "failed";

export interface ImportJobForm {
  mode: ImportMode;
  inputFile: string;
  inputFolder: string;
  outputRoot: string;
}

export interface ImportSourceEntry {
  path: string;
  kind: "chatgpt_export" | "conversation_json" | "json_document" | "text_document" | "pdf_document" | "unsupported";
  supported: boolean;
  reason: string;
}

export interface ImportSourceSummary {
  inputPath: string;
  inputType: "missing" | "file" | "folder";
  totalFiles: number;
  supportedFiles: number;
  unsupportedFiles: number;
  countsByKind: Record<ImportSourceEntry["kind"], number>;
  notes: string[];
  sampleFiles: ImportSourceEntry[];
}

export interface ImportRunResult {
  ok: boolean;
  message: string;
}

export interface RunLogEntry {
  id: string;
  level: "info" | "success" | "warning" | "error";
  message: string;
  timestamp: string;
}
