import type { ImportSupportTier } from "./importHistory";

export interface DatasetSourceContext {
  pipeline_run_id: string;
  source_input_path?: string;
  detected_kind?: string;
  detected_label?: string;
  support_tier?: ImportSupportTier;
  vendor_sources: string[];
  conversation_count?: number;
  message_count?: number;
  attachment_count?: number;
  topic_hints: string[];
}

export interface DatasetRunSummary {
  run_id: string;
  dataset_version: string;
  source_context?: DatasetSourceContext;
  topic_segments: number;
  prompt_response_pairs: number;
  micro_segments: number;
  private_review_segments: number;
  filtered_out_segments: number;
  topics: Record<string, number>;
  tiers: Record<string, number>;
  db_write_stats: Record<string, number>;
}

export interface DatasetRunResult {
  outputRoot: string;
  datasetsRoot: string;
  manifestPath: string;
  latest: DatasetRunSummary | null;
}
