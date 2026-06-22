export type ImportMode = "single_file" | "batch";

export type RunState = "idle" | "running" | "success" | "failed";

export type ImportSupportTier =
  | "mvp_first_class"
  | "mvp_compatibility_fallback"
  | "experimental_expansion"
  | "unsupported";

export interface ImportJobForm {
  mode: ImportMode;
  inputFile: string;
  inputFolder: string;
  outputRoot: string;
}

export interface ImportSourceEntry {
  path: string;
  kind: "chatgpt_export" | "conversation_json" | "gemini_activity_html" | "json_document" | "text_document" | "pdf_document" | "unsupported";
  displayLabel: string;
  supported: boolean;
  supportTier: ImportSupportTier;
  reason: string;
}

export interface ImportSourceVendorSummary {
  vendor: "chatgpt" | "grok" | "claude" | "gemini" | "copilot" | "recovered";
  label: string;
  supportTier: ImportSupportTier;
  detectedFiles: number;
  companionFiles: number;
  recommendation: string;
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
  vendorSummaries: ImportSourceVendorSummary[];
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
