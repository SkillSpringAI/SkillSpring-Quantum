export type ImportMode = "single_file" | "batch";

export type RunState = "idle" | "running" | "success" | "failed";

export interface ImportJobForm {
  mode: ImportMode;
  inputFile: string;
  inputFolder: string;
  outputRoot: string;
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
