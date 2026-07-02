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

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map(x => x.trim())
    .filter(x => x.length > 2 && !STOP_WORDS.has(x));
}

function inferRawTopic(messages: ConversationMessage[]): { rawTopic: string; confidence: number } {
  const counts = new Map<string, number>();

  for (const message of messages) {
    for (const token of tokenize(message.text)) {
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
  }

  const ranked = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([token]) => token);

  const rawTopic = ranked.join(" ");
  const confidence = ranked.length > 0 ? Math.min(0.85, 0.35 + ranked.length * 0.08) : 0.2;

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

  let messageIndex = 0;
  let currentWindow: ConversationMessage[] = [];
  let currentStartIndex = 0;

  const exchanges = groupMessagesByExchange(conversation.messages);

  for (const exchange of exchanges) {
    const candidateWindow = [...currentWindow, ...exchange];
    const inferredCurrent = currentWindow.length > 0 ? inferRawTopic(currentWindow) : undefined;
    const inferredCandidate = inferRawTopic(candidateWindow);
    const currentTokens = inferredCurrent ? tokenize(inferredCurrent.rawTopic) : [];
    const candidateTokens = tokenize(inferredCandidate.rawTopic);
    const similarity = inferredCurrent ? jaccardSimilarity(currentTokens, candidateTokens) : 1;
    const shouldSplit =
      currentWindow.length > 0 &&
      currentWindow.length + exchange.length > windowSize &&
      similarity < 0.45;

    if (shouldSplit) {
      const segment = buildSegment(
        conversation,
        currentWindow,
        currentStartIndex,
        currentStartIndex + currentWindow.length - 1,
        index
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
      buildSegment(
        conversation,
        currentWindow,
        currentStartIndex,
        currentStartIndex + currentWindow.length - 1,
        index
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

function buildSegment(
  conversation: Conversation,
  messages: ConversationMessage[],
  startIndex: number,
  endIndex: number,
  index?: LocalIndexState
): ConversationSegment {
  const inferred = inferRawTopic(messages);
  const normalized = normalizeTopic(inferred.rawTopic, index);
  const classified = classifyMessages(conversation.title, messages);
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
