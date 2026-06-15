import path from "node:path";

type JsonObject = Record<string, unknown>;

function stripBom(text: string): string {
  return text.replace(/^\uFEFF/, "");
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(v => typeof v === "string");
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function requireObject(value: unknown, label: string): JsonObject {
  if (!isObject(value)) {
    throw new Error(label + " must be an object");
  }
  return value;
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new Error(label + " must be a string");
  }
  return value;
}

function requireBoolean(value: unknown, label: string): boolean {
  if (!isBoolean(value)) {
    throw new Error(label + " must be a boolean");
  }
  return value;
}

function requireNumber(value: unknown, label: string): number {
  if (!isNumber(value)) {
    throw new Error(label + " must be a number");
  }
  return value;
}

function requireStringArray(value: unknown, label: string): string[] {
  if (!isStringArray(value)) {
    throw new Error(label + " must be a string[]");
  }
  return value;
}

function validateTopicFilterRules(obj: JsonObject): void {
  requireString(obj.version, "version");
  requireStringArray(obj.include_topics, "include_topics");
  requireStringArray(obj.exclude_topics, "exclude_topics");
  requireBoolean(obj.exclude_general_by_default, "exclude_general_by_default");
}

function validateSignalThresholdRules(obj: JsonObject): void {
  requireString(obj.version, "version");
  const health = requireObject(obj.health_thresholds, "health_thresholds");
  const scoring = requireObject(obj.signal_scoring, "signal_scoring");

  requireNumber(health.duplicate_rate_warning, "health_thresholds.duplicate_rate_warning");
  requireNumber(health.private_review_rate_warning, "health_thresholds.private_review_rate_warning");
  requireNumber(health.low_segment_yield_warning, "health_thresholds.low_segment_yield_warning");
  requireNumber(health.purge_rate_warning, "health_thresholds.purge_rate_warning");

  requireNumber(scoring.high_signal_min_score, "signal_scoring.high_signal_min_score");
  requireNumber(scoring.substantial_content_chars, "signal_scoring.substantial_content_chars");
  requireNumber(scoring.moderate_content_chars, "signal_scoring.moderate_content_chars");
  requireNumber(scoring.multi_message_min, "signal_scoring.multi_message_min");
}

function validateCurationRules(obj: JsonObject): void {
  requireString(obj.version, "version");
  requireStringArray(obj.allowed_signal_tiers, "allowed_signal_tiers");
  requireStringArray(obj.excluded_topics, "excluded_topics");
  requireNumber(obj.minimum_signal_score, "minimum_signal_score");
  requireBoolean(obj.require_nonempty_text, "require_nonempty_text");
  requireNumber(obj.max_redaction_count, "max_redaction_count");
  requireBoolean(obj.allow_private_review, "allow_private_review");

  const collections = requireObject(obj.collections, "collections");
  requireBoolean(collections.topic_segments, "collections.topic_segments");
  requireBoolean(collections.prompt_response_pairs, "collections.prompt_response_pairs");
  requireBoolean(collections.micro_segments, "collections.micro_segments");
}

function validateReviewQueueRules(obj: JsonObject): void {
  requireString(obj.version, "version");
  requireBoolean(obj.enabled, "enabled");
  requireStringArray(obj.allowed_signal_tiers, "allowed_signal_tiers");
  requireNumber(obj.minimum_signal_score, "minimum_signal_score");
  requireNumber(obj.maximum_signal_score, "maximum_signal_score");
  requireNumber(obj.max_redaction_count, "max_redaction_count");
  requireBoolean(obj.exclude_private_review, "exclude_private_review");
  requireStringArray(obj.excluded_topics, "excluded_topics");
  requireString(obj.collection, "collection");
}

function validateReviewDecisionRules(obj: JsonObject): void {
  requireString(obj.version, "version");
  requireBoolean(obj.allow_approve, "allow_approve");
  requireBoolean(obj.allow_reject, "allow_reject");
  requireBoolean(obj.require_reason, "require_reason");

  const collections = requireObject(obj.collections, "collections");
  requireBoolean(collections["review_queue.topic_segments"], 'collections["review_queue.topic_segments"]');
}

function validateBatchPolicy(obj: JsonObject): void {
  requireString(obj.version, "version");
  requireString(obj.input_pattern, "input_pattern");
  requireStringArray(obj.ignore_files, "ignore_files");
  requireBoolean(obj.fail_on_any_file_error, "fail_on_any_file_error");
  requireBoolean(obj.write_batch_report, "write_batch_report");
  requireBoolean(obj.write_batch_aggregate_diagnostics, "write_batch_aggregate_diagnostics");
  requireBoolean(obj.write_batch_delta_report, "write_batch_delta_report");
  requireString(obj.default_output_root, "default_output_root");
}

function validateDatasetRoutingRules(obj: JsonObject): void {
  requireString(obj.version, "version");
  requireObject(obj.tiers, "tiers");
  requireObject(obj.dataset_classes, "dataset_classes");
  requireObject(obj.future_classes, "future_classes");
}

export function validateGovernanceRuleFile(filePath: string, rawText: string): void {
  let parsed: unknown;

  try {
    parsed = JSON.parse(stripBom(rawText));
  } catch (error) {
    throw new Error("Invalid JSON: " + (error instanceof Error ? error.message : String(error)));
  }

  const obj = requireObject(parsed, "root");
  const fileName = path.basename(filePath).toLowerCase();

  switch (fileName) {
    case "topic-filter-rules.json":
    case "topic-filter-rules.test.json":
      validateTopicFilterRules(obj);
      return;

    case "signal-thresholds.json":
      validateSignalThresholdRules(obj);
      return;

    case "curation-rules.json":
      validateCurationRules(obj);
      return;

    case "review-queue-rules.json":
      validateReviewQueueRules(obj);
      return;

    case "review-decision-rules.json":
      validateReviewDecisionRules(obj);
      return;

    case "batch-policy.json":
      validateBatchPolicy(obj);
      return;

    case "dataset-routing-rules.json":
      validateDatasetRoutingRules(obj);
      return;

    default:
      requireString(obj.version, "version");
      return;
  }
}
