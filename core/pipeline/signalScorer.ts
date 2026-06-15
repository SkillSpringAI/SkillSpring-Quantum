import type { ConversationSegment } from "./segmenter.js";

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

const PRIVATE_REVIEW_PATTERNS = [
  /\bpassword\b/i,
  /\bbank\b/i,
  /\baccount number\b/i,
  /\bpassport\b/i,
  /\bdriver(?:'s)? license\b/i,
  /\bsocial security\b/i,
  /\bssn\b/i,
  /\bcredit card\b/i
];

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

  const hardPrivateHit = PRIVATE_REVIEW_PATTERNS.some((pattern) => pattern.test(joined));
  const strongRedactionSignal =
    redactionFlags.includes("email") ||
    redactionFlags.includes("phone") ||
    redactionFlags.includes("address");

  if (hardPrivateHit || strongRedactionSignal || redactionCount >= 2) {
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
