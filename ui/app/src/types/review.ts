export interface ReviewQueueRecord {
  schema_version: string;
  conversation_id: string;
  title?: string;
  topic: string;
  raw_topic: string;
  created_at?: string;
  start_index: number;
  end_index: number;
  message_count: number;
  signal_score: number;
  signal_tier: string;
  signal_reasons: string[];
  redaction_count: number;
  redaction_flags: string[];
  text: string;
}

export interface ReviewDecisionRequest {
  outputRoot: string;
  decision: "approve" | "reject";
  queueKey: string;
  reason: string;
}

export interface ReviewDecisionResult {
  ok: boolean;
  message: string;
}
