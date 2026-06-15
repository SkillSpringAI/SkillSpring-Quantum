export type GovernanceEditorMode = "guided" | "natural-language" | "raw-json";

export interface TopicFilterFormState {
  version: string;
  include_topics_text: string;
  exclude_topics_text: string;
  exclude_general_by_default: boolean;
}

export interface ReviewQueueFormState {
  version: string;
  enabled: boolean;
  allowed_signal_tiers_text: string;
  minimum_signal_score: number;
  maximum_signal_score: number;
  max_redaction_count: number;
  exclude_private_review: boolean;
  excluded_topics_text: string;
  collection: string;
}
