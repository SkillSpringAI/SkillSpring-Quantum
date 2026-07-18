import type {
  GovernanceComposerInput,
  GovernanceComposerResult
} from "../types/governanceComposer";

function tryParseCurrentJson(currentJson?: string): Record<string, unknown> {
  if (!currentJson?.trim()) return {};
  try {
    return JSON.parse(currentJson);
  } catch {
    return {};
  }
}

function extractQuotedList(text: string): string[] {
  const matches = [...text.matchAll(/"([^"]+)"/g)].map(m => m[1]);
  return matches;
}

function detectTopicsAfterKeyword(text: string, keyword: string): string[] {
  const lower = text.toLowerCase();
  const index = lower.indexOf(keyword);
  if (index === -1) return [];

  const segment = text.slice(index + keyword.length);
  const fromQuotes = extractQuotedList(segment);
  if (fromQuotes.length > 0) return fromQuotes;

  return segment
    .split(/[,.\n]/)
    .map(x => x.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function buildTopicFilterRule(input: GovernanceComposerInput): GovernanceComposerResult {
  const base = tryParseCurrentJson(input.currentJson);

  const next: Record<string, unknown> = {
    version: typeof base.version === "string" ? base.version : "topic-filter-rules.v1",
    include_topics: Array.isArray(base.include_topics) ? base.include_topics : [],
    exclude_topics: Array.isArray(base.exclude_topics) ? base.exclude_topics : [],
    exclude_general_by_default:
      typeof base.exclude_general_by_default === "boolean"
        ? base.exclude_general_by_default
        : false
  };

  const lower = input.instruction.toLowerCase();

  if (lower.includes("exclude general by default")) {
    next.exclude_general_by_default = true;
  }

  if (lower.includes("do not exclude general by default") || lower.includes("allow general by default")) {
    next.exclude_general_by_default = false;
  }

  const includeTopics = detectTopicsAfterKeyword(input.instruction, "include");
  if (includeTopics.length > 0) {
    next.include_topics = includeTopics;
  }

  const excludeTopics = detectTopicsAfterKeyword(input.instruction, "exclude");
  if (excludeTopics.length > 0) {
    next.exclude_topics = excludeTopics;
  }

  return {
    ok: true,
    message: "Structured draft generated from plain-language input.",
    generatedJson: JSON.stringify(next, null, 2)
  };
}

function buildReviewQueueRule(input: GovernanceComposerInput): GovernanceComposerResult {
  const base = tryParseCurrentJson(input.currentJson);

  const next: Record<string, unknown> = {
    version: typeof base.version === "string" ? base.version : "review-queue-rules.v1",
    enabled: typeof base.enabled === "boolean" ? base.enabled : true,
    allowed_signal_tiers: Array.isArray(base.allowed_signal_tiers) ? base.allowed_signal_tiers : ["high_signal", "low_signal"],
    minimum_signal_score: typeof base.minimum_signal_score === "number" ? base.minimum_signal_score : 3,
    maximum_signal_score: typeof base.maximum_signal_score === "number" ? base.maximum_signal_score : 4,
    max_redaction_count: typeof base.max_redaction_count === "number" ? base.max_redaction_count : 0,
    exclude_private_review: typeof base.exclude_private_review === "boolean" ? base.exclude_private_review : true,
    excluded_topics: Array.isArray(base.excluded_topics) ? base.excluded_topics : [],
    collection: typeof base.collection === "string" ? base.collection : "topic_segments"
  };

  const lower = input.instruction.toLowerCase();

  if (lower.includes("disable review queue")) {
    next.enabled = false;
  }

  if (lower.includes("enable review queue")) {
    next.enabled = true;
  }

  const minMatch = lower.match(/minimum signal score\s+(\d+)/);
  if (minMatch) {
    next.minimum_signal_score = Number(minMatch[1]);
  }

  const maxMatch = lower.match(/maximum signal score\s+(\d+)/);
  if (maxMatch) {
    next.maximum_signal_score = Number(maxMatch[1]);
  }

  return {
    ok: true,
    message: "Structured review-queue draft generated.",
    generatedJson: JSON.stringify(next, null, 2)
  };
}

function buildRedactionRule(input: GovernanceComposerInput): GovernanceComposerResult {
  const base = tryParseCurrentJson(input.currentJson);
  const next: Record<string, unknown> = {
    version: typeof base.version === "string" ? base.version : "redaction-rules.v1",
    hard_private_patterns: Array.isArray(base.hard_private_patterns) ? base.hard_private_patterns : [],
    redaction_targets: Array.isArray(base.redaction_targets) ? base.redaction_targets : ["email", "phone", "url", "address"],
    private_review_triggers: typeof base.private_review_triggers === "object" && base.private_review_triggers !== null
      ? base.private_review_triggers
      : {
          redaction_count_min: 2,
          strong_flags: ["email", "phone", "address"]
        }
  };

  const lower = input.instruction.toLowerCase();
  const quoted = extractQuotedList(input.instruction);
  const existingPatterns = Array.isArray(next.hard_private_patterns) ? next.hard_private_patterns as string[] : [];

  if (
    lower.includes("redact") ||
    lower.includes("private pattern") ||
    lower.includes("sensitive phrase") ||
    lower.includes("mentions of")
  ) {
    next.hard_private_patterns = [...new Set([...existingPatterns, ...quoted])];
  }

  const targetMatches = detectTopicsAfterKeyword(input.instruction, "redaction targets");
  if (targetMatches.length > 0) {
    next.redaction_targets = targetMatches;
  }

  const countMatch = lower.match(/redaction count min(?:imum)?\s+(\d+)/);
  if (countMatch) {
    next.private_review_triggers = {
      ...(next.private_review_triggers as Record<string, unknown>),
      redaction_count_min: Number(countMatch[1])
    };
  }

  const strongFlags = detectTopicsAfterKeyword(input.instruction, "strong flags");
  if (strongFlags.length > 0) {
    next.private_review_triggers = {
      ...(next.private_review_triggers as Record<string, unknown>),
      strong_flags: strongFlags
    };
  }

  return {
    ok: true,
    message: quoted.length > 0
      ? "Structured redaction draft generated with quoted phrases added to hard private patterns."
      : "Structured redaction draft generated.",
    generatedJson: JSON.stringify(next, null, 2)
  };
}

export function generateGovernanceDraft(
  input: GovernanceComposerInput
): GovernanceComposerResult {
  const file = input.ruleFileName.toLowerCase();

  if (file === "topic-filter-rules.json" || file === "topic-filter-rules.test.json") {
    return buildTopicFilterRule(input);
  }

  if (file === "review-queue-rules.json") {
    return buildReviewQueueRule(input);
  }

  if (file === "redaction-rules.json") {
    return buildRedactionRule(input);
  }

  return {
    ok: false,
    message: "Plain-language drafting is not yet implemented for this rule file.",
    generatedJson: input.currentJson || ""
  };
}
