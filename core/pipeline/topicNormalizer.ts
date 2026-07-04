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

const TOPIC_LABEL_OVERRIDES: Record<string, string> = {
  docker_networking: "Docker Networking",
  ci_cd: "CI/CD",
  typescript_node: "TypeScript and Node",
  python_backend: "Python Backend",
  database_sql: "Database and SQL",
  api_integration: "API Integration",
  ai_systems: "AI Systems"
};

const FALLBACK_STOP_TOKENS = new Set([
  "assistant","chat","conversation","discuss","discussion","general","help","message","messages","question",
  "reply","response","summary","task","topic","topics","update","updates"
]);

function normalizeText(input: string): string {
  return input.toLowerCase();
}

function fallbackNormalize(rawTopic: string): string {
  const source = normalizeText(rawTopic);
  const tokens = source
    .replace(/[^a-z0-9\s\-_]/g, " ")
    .split(/\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 3 && !FALLBACK_STOP_TOKENS.has(part))
    .slice(0, 4);

  return tokens.join("_") || "general";
}

export function formatNormalizedTopicLabel(topic: string): string {
  const normalized = topic.trim().toLowerCase();
  if (!normalized) {
    return "General";
  }

  const override = TOPIC_LABEL_OVERRIDES[normalized];
  if (override) {
    return override;
  }

  return normalized
    .replace(/[_-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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
