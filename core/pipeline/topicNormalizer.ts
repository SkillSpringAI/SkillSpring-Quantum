import { loadTopicNormalizationRules } from "../governance/loadRules.js";
import { scoreCanonicalTopics } from "./topicScorer.js";
import type { LocalIndexState } from "../index/state.js";
import { resolveAliasMemory } from "../index/indexStore.js";

export interface NormalizedTopicResult {
  rawTopic: string;
  normalizedTopic: string;
  confidence: number;
  reason: string;
  matchedKeywords: string[];
}

function normalizeText(input: string): string {
  return input.toLowerCase();
}

function fallbackNormalize(rawTopic: string): string {
  const source = normalizeText(rawTopic);

  return source
    .replace(/[^a-z0-9\s\-_]/g, " ")
    .replace(/\s+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60) || "general";
}

export function normalizeTopic(rawTopic: string, index?: LocalIndexState): NormalizedTopicResult {
  const source = normalizeText(rawTopic);
  const rules = loadTopicNormalizationRules();

  const aliasResolved = index ? resolveAliasMemory(index, source) : null;
  if (aliasResolved) {
    return {
      rawTopic,
      normalizedTopic: aliasResolved,
      confidence: 0.9,
      reason: "alias_memory",
      matchedKeywords: []
    };
  }

  const scored = scoreCanonicalTopics(source);
  const best = scored[0];

  if (best && best.score >= 2 && rules.canonical_topics[best.topic]) {
    return {
      rawTopic,
      normalizedTopic: best.topic,
      confidence: Math.min(0.95, 0.45 + best.score * 0.15),
      reason: "canonical_keyword_score",
      matchedKeywords: best.matchedKeywords
    };
  }

  return {
    rawTopic,
    normalizedTopic: fallbackNormalize(rawTopic),
    confidence: 0.35,
    reason: "fallback_normalization",
    matchedKeywords: []
  };
}
