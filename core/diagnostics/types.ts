export interface DiagnosticWarning {
  code: string;
  message: string;
  file?: string;
  conversationId?: string;
}

export interface DiagnosticError {
  code: string;
  message: string;
  file?: string;
  stack?: string;
}

export interface HealthChecks {
  duplicate_rate_warning: boolean;
  private_review_rate_warning: boolean;
  low_segment_yield_warning: boolean;
  purge_rate_warning: boolean;
}

export interface RunDiagnostics {
  run_id: string;
  started_at: string;
  completed_at?: string;
  status: "running" | "success" | "failed";
  program_version: string;
  pipeline_version: string;
  dataset_version: string;
  files_processed: number;
  conversations_found: number;
  raw_conversations_written: number;
  raw_conversations_skipped: number;
  attachments_referenced: number;
  attachments_archived: number;
  attachments_missing: number;
  segments_created: number;
  segments_purged: number;
  markdown_primary_written: number;
  duplicates_skipped: number;
  backups_written: number;
  archived_existing: number;
  dataset_topic_segments: number;
  dataset_prompt_response_pairs: number;
  dataset_micro_segments: number;
  dataset_private_review_segments: number;
  warnings: DiagnosticWarning[];
  errors: DiagnosticError[];
  health_checks: HealthChecks;
  settings: {
    segment_window_size: number;
    output_root: string;
  };
}
