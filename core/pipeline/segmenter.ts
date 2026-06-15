import type { Conversation, ConversationMessage } from "../parser/types.js";
import { normalizeTopic } from "./topicNormalizer.js";
import type { LocalIndexState } from "../index/state.js";

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
      const inferred = inferRawTopic(currentWindow);
      const normalized = normalizeTopic(inferred.rawTopic, index);

      provisionalSegments.push({
        conversationId: conversation.id,
        source: conversation.source,
        title: conversation.title,
        createdAt: conversation.createdAt,
        participants: conversation.participants,
        topic: normalized.normalizedTopic,
        rawTopic: normalized.rawTopic,
        confidence: Math.max(inferred.confidence, normalized.confidence),
        reason: normalized.reason,
        matchedKeywords: normalized.matchedKeywords,
        startIndex: currentStartIndex,
        endIndex: currentStartIndex + currentWindow.length - 1,
        messages: currentWindow
      });

      currentStartIndex = messageIndex;
      currentWindow = [];
    }

    currentWindow.push(...exchange);
    messageIndex += exchange.length;
  }

  if (currentWindow.length > 0) {
    const windowMessages = currentWindow;
    const inferred = inferRawTopic(windowMessages);
    const normalized = normalizeTopic(inferred.rawTopic, index);

    provisionalSegments.push({
      conversationId: conversation.id,
      source: conversation.source,
      title: conversation.title,
      createdAt: conversation.createdAt,
      participants: conversation.participants,
      topic: normalized.normalizedTopic,
      rawTopic: normalized.rawTopic,
      confidence: Math.max(inferred.confidence, normalized.confidence),
      reason: normalized.reason,
      matchedKeywords: normalized.matchedKeywords,
      startIndex: currentStartIndex,
      endIndex: currentStartIndex + windowMessages.length - 1,
      messages: windowMessages
    });
  }

  const merged: ConversationSegment[] = [];

  for (const segment of provisionalSegments) {
    const previous = merged[merged.length - 1];

    if (previous && sameTopic(previous, segment)) {
      previous.endIndex = segment.endIndex;
      previous.messages.push(...segment.messages);
      previous.confidence = Math.max(previous.confidence, segment.confidence);
      previous.matchedKeywords = [...new Set([...previous.matchedKeywords, ...segment.matchedKeywords])];
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
