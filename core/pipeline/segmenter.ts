import type { Conversation, ConversationMessage } from "../parser/types.js";
import { formatNormalizedTopicLabel, normalizeTopic } from "./topicNormalizer.js";
import type { LocalIndexState } from "../index/state.js";
import {
  classifyMessages,
  type SegmentImportance,
  type SegmentIntentLabel
} from "../models/classifier.js";

export interface ConversationSegment {
  conversationId: string;
  source: Conversation["source"];
  title?: string;
  createdAt?: string;
  participants: string[];
  topic: string;
  rawTopic: string;
  confidence: number;
  reason: string;
  matchedKeywords: string[];
  summaryLabel?: string;
  intent?: SegmentIntentLabel;
  importance?: SegmentImportance;
  classificationConfidence?: number;
  classificationReasons?: string[];
  domainHint?: string;
  startIndex: number;
  endIndex: number;
  messages: ConversationMessage[];
}

const STOP_WORDS = new Set([
  "the","a","an","and","or","but","if","then","else","to","of","in","on","for","with","is","it","this","that",
  "i","you","we","they","he","she","them","my","your","our","was","were","be","been","am","are","as","at","by",
  "from","so","do","does","did","can","could","would","should","have","has","had","just","about","into","how",
  "what","when","where","why","which"
]);

const GENERIC_TOPIC_TOKENS = new Set([
  "assistant","chat","conversation","discuss","discussion","help","need","question","reply","response","summary",
  "talk","task","thing","things","topic","topics","update","updates","user"
]);

const TOKEN_CACHE_LIMIT = 12000;

function getCachedValue<K, V>(cache: Map<K, V>, key: K, compute: () => V, limit?: number): V {
  const existing = cache.get(key);
  if (existing !== undefined) {
    cache.delete(key);
    cache.set(key, existing);
    return existing;
  }

  const value = compute();
  cache.set(key, value);

  if (limit && cache.size > limit) {
    const oldestKey = cache.keys().next().value as K | undefined;
    if (oldestKey !== undefined) {
      cache.delete(oldestKey);
    }
  }

  return value;
}

const tokenCache = new Map<string, string[]>();
const candidateTokenCache = new Map<string, string[]>();

function tokenize(text: string): string[] {
  return getCachedValue(tokenCache, text, () => (
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .map(x => x.trim())
      .filter(x => x.length > 2 && !STOP_WORDS.has(x))
  ), TOKEN_CACHE_LIMIT);
}

function normalizeCandidateTokens(text: string): string[] {
  return getCachedValue(candidateTokenCache, text, () => (
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length > 2 && !STOP_WORDS.has(token) && !GENERIC_TOPIC_TOKENS.has(token))
  ), TOKEN_CACHE_LIMIT);
}

function scoreMessageRole(role: ConversationMessage["role"]): number {
  if (role === "user" || role === "system") {
    return 3;
  }

  return 1;
}

function collectTopicCandidates(messages: ConversationMessage[]): Map<string, number> {
  const candidates = new Map<string, number>();

  for (const message of messages) {
    const tokens = normalizeCandidateTokens(message.text);
    const weight = scoreMessageRole(message.role);

    for (const token of tokens) {
      candidates.set(token, (candidates.get(token) ?? 0) + weight);
    }

    for (let size = 3; size >= 2; size -= 1) {
      for (let index = 0; index <= tokens.length - size; index += 1) {
        const phraseTokens = tokens.slice(index, index + size);
        if (phraseTokens.every((token) => token.length <= 3)) {
          continue;
        }

        const phrase = phraseTokens.join(" ");
        const phraseScore = weight * (size + 1) - index * 0.15;
        candidates.set(phrase, Math.max(candidates.get(phrase) ?? 0, phraseScore));
      }
    }
  }

  return candidates;
}

function inferRawTopic(messages: ConversationMessage[]): { rawTopic: string; confidence: number } {
  const candidates = collectTopicCandidates(messages);
  const ranked = [...candidates.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return b[0].split(" ").length - a[0].split(" ").length;
  });

  const preferredPhrase = ranked.find(([candidate, score]) => candidate.includes(" ") && score >= 6)?.[0];
  const fallbackTokens = ranked
    .filter(([candidate]) => !candidate.includes(" "))
    .slice(0, 4)
    .map(([candidate]) => candidate);

  const rawTopic = preferredPhrase || fallbackTokens.join(" ");
  const confidenceBase = preferredPhrase ? 0.54 : 0.35;
  const confidence = ranked.length > 0 ? Math.min(0.9, confidenceBase + Math.min(0.28, ranked.length * 0.05)) : 0.2;

  return {
    rawTopic: rawTopic || "general",
    confidence
  };
}

function jaccardSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;

  const aSet = new Set(a);
  const bSet = new Set(b);
  let intersection = 0;

  for (const token of aSet) {
    if (bSet.has(token)) {
      intersection += 1;
    }
  }

  return intersection / new Set([...aSet, ...bSet]).size;
}

function sameTopic(a: ConversationSegment, b: ConversationSegment): boolean {
  if (a.summaryLabel && b.summaryLabel && a.summaryLabel === b.summaryLabel) return true;
  if (a.topic === b.topic) return true;
  if (a.topic === "general" || b.topic === "general") return false;

  const similarity = jaccardSimilarity(
    tokenize(a.rawTopic + " " + a.matchedKeywords.join(" ")),
    tokenize(b.rawTopic + " " + b.matchedKeywords.join(" "))
  );

  return similarity >= 0.55;
}

function groupMessagesByExchange(messages: ConversationMessage[]): ConversationMessage[][] {
  const groups: ConversationMessage[][] = [];
  let current: ConversationMessage[] = [];

  for (const message of messages) {
    if (message.role === "user" && current.length > 0) {
      groups.push(current);
      current = [];
    }

    current.push(message);
  }

  if (current.length > 0) {
    groups.push(current);
  }

  return groups;
}

export function segmentConversation(
  conversation: Conversation,
  windowSize = 4,
  index?: LocalIndexState
): ConversationSegment[] {
  if (conversation.messages.length === 0) {
    return [];
  }

  const provisionalSegments: ConversationSegment[] = [];
  const topicInferenceCache = new Map<string, { rawTopic: string; confidence: number }>();
  const normalizedTopicCache = new Map<string, ReturnType<typeof normalizeTopic>>();
  const classificationCache = new Map<string, ReturnType<typeof classifyMessages>>();
  const segmentCache = new Map<string, ConversationSegment>();

  let messageIndex = 0;
  let currentWindow: ConversationMessage[] = [];
  let currentStartIndex = 0;

  const exchanges = groupMessagesByExchange(conversation.messages);

  function windowKey(messages: ConversationMessage[]): string {
    if (messages.length === 0) {
      return "empty";
    }

    const first = messages[0];
    const last = messages[messages.length - 1];
    return [
      messages.length,
      first.id ?? first.role,
      first.text.length,
      last.id ?? last.role,
      last.text.length
    ].join("|");
  }

  function inferRawTopicCached(messages: ConversationMessage[]): { rawTopic: string; confidence: number } {
    const key = windowKey(messages);
    return getCachedValue(topicInferenceCache, key, () => inferRawTopic(messages));
  }

  function normalizeTopicCached(rawTopic: string): ReturnType<typeof normalizeTopic> {
    const key = rawTopic.trim().toLowerCase();
    return getCachedValue(normalizedTopicCache, key, () => normalizeTopic(rawTopic, index));
  }

  function classifyMessagesCached(messages: ConversationMessage[]): ReturnType<typeof classifyMessages> {
    const key = windowKey(messages);
    return getCachedValue(classificationCache, key, () => classifyMessages(conversation.title, messages));
  }

  function buildSegmentCached(
    messages: ConversationMessage[],
    startIndex: number,
    endIndex: number
  ): ConversationSegment {
    const key = `${windowKey(messages)}|${startIndex}|${endIndex}`;
    return getCachedValue(segmentCache, key, () => {
      const inferred = inferRawTopicCached(messages);
      const normalized = normalizeTopicCached(inferred.rawTopic);
      const classified = classifyMessagesCached(messages);
      const summaryLabel = buildDeterministicSummaryLabel(
        classified?.summaryLabel,
        classified?.intent,
        normalized.normalizedTopic,
        normalized.rawTopic,
        conversation.title
      );

      return {
        conversationId: conversation.id,
        source: conversation.source,
        title: conversation.title,
        createdAt: conversation.createdAt,
        participants: conversation.participants,
        topic: normalized.normalizedTopic,
        rawTopic: normalized.rawTopic,
        confidence: Math.max(inferred.confidence, normalized.confidence, classified?.confidence ?? 0),
        reason: normalized.reason,
        matchedKeywords: normalized.matchedKeywords,
        summaryLabel,
        intent: classified?.intent,
        importance: classified?.importance,
        classificationConfidence: classified?.confidence,
        classificationReasons: classified?.reasons,
        domainHint: classified?.domain,
        startIndex,
        endIndex,
        messages
      };
    });
  }

  for (const exchange of exchanges) {
    const candidateWindow = [...currentWindow, ...exchange];
    const inferredCurrent = currentWindow.length > 0 ? inferRawTopicCached(currentWindow) : undefined;
    const inferredCandidate = inferRawTopicCached(candidateWindow);
    const inferredExchange = inferRawTopicCached(exchange);
    const currentTokens = inferredCurrent ? tokenize(inferredCurrent.rawTopic) : [];
    const candidateTokens = tokenize(inferredCandidate.rawTopic);
    const exchangeTokens = tokenize(inferredExchange.rawTopic);
    const similarity = inferredCurrent ? jaccardSimilarity(currentTokens, candidateTokens) : 1;
    const exchangeSimilarity = inferredCurrent ? jaccardSimilarity(currentTokens, exchangeTokens) : 1;
    const currentNormalizedTopic = inferredCurrent ? normalizeTopicCached(inferredCurrent.rawTopic).normalizedTopic : "general";
    const exchangeNormalizedTopic = normalizeTopicCached(inferredExchange.rawTopic).normalizedTopic;
    const currentClassification = currentWindow.length > 0 ? classifyMessagesCached(currentWindow) : null;
    const exchangeClassification = classifyMessagesCached(exchange);
    const strongDomainShift =
      !!currentClassification &&
      !!exchangeClassification &&
      currentClassification.domain !== "General" &&
      exchangeClassification.domain !== "General" &&
      currentClassification.domain !== exchangeClassification.domain;
    const strongIntentShift =
      !!currentClassification &&
      !!exchangeClassification &&
      currentClassification.intent !== "general" &&
      exchangeClassification.intent !== "general" &&
      currentClassification.intent !== exchangeClassification.intent;
    const strongTopicShift =
      currentNormalizedTopic !== "general" &&
      exchangeNormalizedTopic !== "general" &&
      currentNormalizedTopic !== exchangeNormalizedTopic &&
      exchangeSimilarity < 0.22;
    const hardSplit = currentWindow.length > 0 && (
      strongTopicShift ||
      (strongDomainShift && exchangeSimilarity < 0.18) ||
      (strongIntentShift && exchangeSimilarity < 0.12)
    );
    const shouldSplit =
      currentWindow.length > 0 &&
      ((currentWindow.length + exchange.length > windowSize && similarity < 0.45) || hardSplit);

    if (shouldSplit) {
      const segment = buildSegmentCached(
        currentWindow,
        currentStartIndex,
        currentStartIndex + currentWindow.length - 1
      );

      provisionalSegments.push(segment);

      currentStartIndex = messageIndex;
      currentWindow = [];
    }

    currentWindow.push(...exchange);
    messageIndex += exchange.length;
  }

  if (currentWindow.length > 0) {
    provisionalSegments.push(
      buildSegmentCached(
        currentWindow,
        currentStartIndex,
        currentStartIndex + currentWindow.length - 1
      )
    );
  }

  const merged: ConversationSegment[] = [];

  for (const segment of provisionalSegments) {
    const previous = merged[merged.length - 1];

    if (previous && sameTopic(previous, segment)) {
      previous.endIndex = segment.endIndex;
      previous.messages.push(...segment.messages);
      previous.confidence = Math.max(previous.confidence, segment.confidence);
      previous.matchedKeywords = [...new Set([...previous.matchedKeywords, ...segment.matchedKeywords])];
      if (!previous.summaryLabel && segment.summaryLabel) {
        previous.summaryLabel = segment.summaryLabel;
      }
      if ((!previous.importance || previous.importance === "low") && segment.importance) {
        previous.importance = segment.importance;
      }
      if ((!previous.intent || previous.intent === "general") && segment.intent) {
        previous.intent = segment.intent;
      }
      previous.classificationConfidence = Math.max(
        previous.classificationConfidence ?? 0,
        segment.classificationConfidence ?? 0
      );
      previous.classificationReasons = [
        ...new Set([...(previous.classificationReasons ?? []), ...(segment.classificationReasons ?? [])])
      ];
      continue;
    }

    merged.push({
      ...segment,
      messages: [...segment.messages],
      matchedKeywords: [...segment.matchedKeywords]
    });
  }

  return merged.filter(segment => segment.messages.length > 0);
}

const GENERIC_SUMMARY_LABELS = new Set([
  "Troubleshooting",
  "Planning",
  "Decision",
  "Review",
  "Research",
  "Implementation",
  "Request",
  "How-To",
  "Discussion",
  "General Discussion"
]);

function buildDeterministicSummaryLabel(
  classifierSummaryLabel: string | undefined,
  intent: SegmentIntentLabel | undefined,
  normalizedTopic: string,
  rawTopic: string,
  title: string | undefined
): string {
  const trimmedClassifier = classifierSummaryLabel?.trim();
  if (trimmedClassifier && !GENERIC_SUMMARY_LABELS.has(trimmedClassifier)) {
    return trimmedClassifier;
  }

  const topicLabel = pickTopicDisplayLabel(normalizedTopic, rawTopic, title);
  if (!topicLabel) {
    return trimmedClassifier || "General Discussion";
  }

  const suffix = intentToDisplaySuffix(intent);
  if (!suffix) {
    return topicLabel;
  }

  if (topicLabel.endsWith(suffix)) {
    return topicLabel;
  }

  return `${topicLabel} ${suffix}`;
}

function pickTopicDisplayLabel(
  normalizedTopic: string,
  rawTopic: string,
  title: string | undefined
): string | null {
  if (normalizedTopic && normalizedTopic !== "general") {
    return formatNormalizedTopicLabel(normalizedTopic);
  }

  const cleanedRaw = rawTopic
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (cleanedRaw && cleanedRaw !== "general") {
    return cleanedRaw
      .split(" ")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  const trimmedTitle = title?.trim();
  if (trimmedTitle && !/^(new chat|untitled|conversation|chat)$/i.test(trimmedTitle)) {
    return trimmedTitle.length > 48 ? trimmedTitle.slice(0, 48).trim() : trimmedTitle;
  }

  return null;
}

function intentToDisplaySuffix(intent: SegmentIntentLabel | undefined): string {
  switch (intent) {
    case "troubleshooting":
      return "Troubleshooting";
    case "planning":
      return "Planning";
    case "decision":
      return "Decision";
    case "review":
      return "Review";
    case "research":
      return "Research";
    case "implementation":
      return "Implementation";
    case "request":
      return "Request";
    case "explanation":
      return "How-To";
    default:
      return "Discussion";
  }
}
