import type {
  ReviewQueueFormState,
  TopicFilterFormState
} from "../types/governanceForms";

function splitList(text: string): string[] {
  return text
    .split(",")
    .map(x => x.trim())
    .filter(Boolean);
}

export function parseTopicFilterJson(rawText: string): TopicFilterFormState {
  try {
    const parsed = JSON.parse(rawText);
    return {
      version: typeof parsed.version === "string" ? parsed.version : "topic-filter-rules.v1",
      include_topics_text: Array.isArray(parsed.include_topics) ? parsed.include_topics.join(", ") : "",
      exclude_topics_text: Array.isArray(parsed.exclude_topics) ? parsed.exclude_topics.join(", ") : "",
      exclude_general_by_default: !!parsed.exclude_general_by_default
    };
  } catch {
    return {
      version: "topic-filter-rules.v1",
      include_topics_text: "",
      exclude_topics_text: "",
      exclude_general_by_default: false
    };
  }
}

export function buildTopicFilterJson(state: TopicFilterFormState): string {
  return JSON.stringify(
    {
      version: state.version,
      include_topics: splitList(state.include_topics_text),
      exclude_topics: splitList(state.exclude_topics_text),
      exclude_general_by_default: state.exclude_general_by_default
    },
    null,
    2
  );
}

export function parseReviewQueueJson(rawText: string): ReviewQueueFormState {
  try {
    const parsed = JSON.parse(rawText);
    return {
      version: typeof parsed.version === "string" ? parsed.version : "review-queue-rules.v1",
      enabled: !!parsed.enabled,
      allowed_signal_tiers_text: Array.isArray(parsed.allowed_signal_tiers) ? parsed.allowed_signal_tiers.join(", ") : "high_signal, low_signal",
      minimum_signal_score: typeof parsed.minimum_signal_score === "number" ? parsed.minimum_signal_score : 3,
      maximum_signal_score: typeof parsed.maximum_signal_score === "number" ? parsed.maximum_signal_score : 4,
      max_redaction_count: typeof parsed.max_redaction_count === "number" ? parsed.max_redaction_count : 0,
      exclude_private_review: !!parsed.exclude_private_review,
      excluded_topics_text: Array.isArray(parsed.excluded_topics) ? parsed.excluded_topics.join(", ") : "",
      collection: typeof parsed.collection === "string" ? parsed.collection : "topic_segments"
    };
  } catch {
    return {
      version: "review-queue-rules.v1",
      enabled: true,
      allowed_signal_tiers_text: "high_signal, low_signal",
      minimum_signal_score: 3,
      maximum_signal_score: 4,
      max_redaction_count: 0,
      exclude_private_review: true,
      excluded_topics_text: "",
      collection: "topic_segments"
    };
  }
}

export function buildReviewQueueJson(state: ReviewQueueFormState): string {
  return JSON.stringify(
    {
      version: state.version,
      enabled: state.enabled,
      allowed_signal_tiers: splitList(state.allowed_signal_tiers_text),
      minimum_signal_score: Number(state.minimum_signal_score),
      maximum_signal_score: Number(state.maximum_signal_score),
      max_redaction_count: Number(state.max_redaction_count),
      exclude_private_review: state.exclude_private_review,
      excluded_topics: splitList(state.excluded_topics_text),
      collection: state.collection
    },
    null,
    2
  );
}
