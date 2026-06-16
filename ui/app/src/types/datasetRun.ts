export interface DatasetRunSummary {
  run_id: string;
  dataset_version: string;
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
