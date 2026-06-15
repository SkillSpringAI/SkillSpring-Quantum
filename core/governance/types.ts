export interface TopicNormalizationRules {
  version: string;
  canonical_topics: Record<string, string[]>;
}

export interface WasteRules {
  version: string;
  purge_conditions: {
    trivial_acknowledgement_max_chars: number;
    short_general_segment_max_messages: number;
    short_general_segment_max_chars: number;
    assistant_only_fragment_max_chars: number;
  };
  trivial_patterns: string[];
}

export interface SignalThresholdRules {
  version: string;
  health_thresholds: {
    duplicate_rate_warning: number;
    private_review_rate_warning: number;
    low_segment_yield_warning: number;
    purge_rate_warning: number;
  };
  signal_scoring: {
    high_signal_min_score: number;
    substantial_content_chars: number;
    moderate_content_chars: number;
    multi_message_min: number;
  };
}

export interface RedactionRules {
  version: string;
  hard_private_patterns: string[];
  redaction_targets: string[];
  private_review_triggers: {
    redaction_count_min: number;
    strong_flags: string[];
  };
}

export interface TopicFilterRules {
  version: string;
  include_topics: string[];
  exclude_topics: string[];
  exclude_general_by_default: boolean;
}

export interface CurationRules {
  version: string;
  allowed_signal_tiers: string[];
  excluded_topics: string[];
  minimum_signal_score: number;
  require_nonempty_text: boolean;
  max_redaction_count: number;
  allow_private_review: boolean;
  collections: {
    topic_segments: boolean;
    prompt_response_pairs: boolean;
    micro_segments: boolean;
  };
}

export interface ReviewQueueRules {
  version: string;
  enabled: boolean;
  allowed_signal_tiers: string[];
  minimum_signal_score: number;
  maximum_signal_score: number;
  max_redaction_count: number;
  exclude_private_review: boolean;
  excluded_topics: string[];
  collection: string;
}

export interface ReviewDecisionRules {
  version: string;
  allow_approve: boolean;
  allow_reject: boolean;
  require_reason: boolean;
  collections: {
    "review_queue.topic_segments": boolean;
  };
}
