import type { ConversationSegment } from "./segmenter.js";
import { loadRedactionRules } from "../governance/loadRules.js";

export type SignalTier = "high_signal" | "low_signal" | "private_review";

export interface SignalAssessment {
  score: number;
  tier: SignalTier;
  reasons: string[];
}

const LOW_SIGNAL_PATTERNS = [
  /\bthanks\b/i,
  /\bthank you\b/i,
  /\bokay\b/i,
  /\bok\b/i,
  /\bcool\b/i,
  /\bgot it\b/i,
  /\bhello\b/i,
  /\bhi\b/i
];

const REDACTION_RULES = loadRedactionRules();

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildPrivateReviewPatterns(): RegExp[] {
  return REDACTION_RULES.hard_private_patterns
    .map((pattern) => pattern.trim())
    .filter(Boolean)
    .map((pattern) => new RegExp(escapeRegExp(pattern), "i"));
}

const PRIVATE_REVIEW_PATTERNS = buildPrivateReviewPatterns();

export function assessSegmentSignal(
  segment: ConversationSegment,
  redactionFlags: string[] = [],
  redactionCount = 0
): SignalAssessment {
  const joined = segment.messages.map((m) => m.text).join("\n\n");
  const reasons: string[] = [];
  let score = 0;

  if (segment.messages.length >= 4) {
    score += 2;
    reasons.push("multi-message segment");
  }

  if (joined.length >= 400) {
    score += 2;
    reasons.push("substantial content");
  } else if (joined.length >= 150) {
    score += 1;
    reasons.push("moderate content");
  }

  if (segment.topic !== "general") {
    score += 2;
    reasons.push("specific topic");
  }

  if (/\bhow\b|\bbuild\b|\bfix\b|\bcreate\b|\bimplement\b|\bdesign\b/i.test(joined)) {
    score += 2;
    reasons.push("task-oriented");
  }

  if (/\bcode\b|\bjson\b|\btypescript\b|\bpython\b|\bapi\b|\bschema\b|\bpipeline\b/i.test(joined)) {
    score += 2;
    reasons.push("technical density");
  }

  if (LOW_SIGNAL_PATTERNS.some((pattern) => pattern.test(joined)) && joined.length < 120) {
    score -= 2;
    reasons.push("short low-signal phrasing");
  }

  const hardPrivateHit =
    redactionFlags.includes("hard_private_pattern") ||
    PRIVATE_REVIEW_PATTERNS.some((pattern) => pattern.test(joined));
  const strongRedactionSignal = redactionFlags.some((flag) =>
    REDACTION_RULES.private_review_triggers.strong_flags.includes(flag)
  );

  if (
    hardPrivateHit ||
    strongRedactionSignal ||
    redactionCount >= REDACTION_RULES.private_review_triggers.redaction_count_min
  ) {
    reasons.push("private review trigger");
    return {
      score,
      tier: "private_review",
      reasons
    };
  }

  if (score >= 5) {
    return {
      score,
      tier: "high_signal",
      reasons
    };
  }

  return {
    score,
    tier: "low_signal",
    reasons
  };
}
