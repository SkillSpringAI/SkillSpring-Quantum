import { promises as fs } from "node:fs";
import type { ConversationParserKind, DetectedConversationParse } from "../parser/detectConversationExport.js";
import { detectAndParseConversationExport } from "../parser/index.js";
import {
  canStreamChatGptConversationsFromRaw,
  iterateChatGptConversationsFromRaw,
  looksLikeChatGptConversationArrayText
} from "../parser/chatgpt.js";
import type { Conversation } from "../parser/types.js";
import { segmentConversation } from "../pipeline/segmenter.js";
import { formatNormalizedTopicLabel } from "../pipeline/topicNormalizer.js";
import type { ImportSourceKind, ImportRunFileResult } from "./sourceIntake.js";

export type ImportSupportTier =
  | "mvp_first_class"
  | "mvp_compatibility_fallback"
  | "experimental_expansion"
  | "unsupported";

export interface ConversationImportMetadata {
  sourceCategory: "conversation";
  detectedKind: ConversationParserKind;
  detectedLabel: string;
  supportTier: ImportSupportTier;
  conversationIds: string[];
  vendorSources: Conversation["source"][];
  conversationCount: number;
  messageCount: number;
  participantCount: number;
  attachmentCount: number;
  startedAt?: string;
  endedAt?: string;
  sampleTitles: string[];
  topicHints: string[];
}

export interface DocumentImportMetadata {
  sourceCategory: "document";
  sourceKind: Exclude<ImportSourceKind, "chatgpt_export" | "conversation_json" | "gemini_activity_html" | "unsupported">;
  supportTier: ImportSupportTier;
  fileExtension: string;
  sizeBytes: number;
  parseStatus: "text_extracted" | "binary_archived_only";
  textLength: number;
}

export type ImportFileMetadata = ConversationImportMetadata | DocumentImportMetadata;

export interface ImportRunRetrievalSummary {
  supportTiers: ImportSupportTier[];
  vendorSources: Conversation["source"][];
  topicHints: string[];
  startedAt?: string;
  endedAt?: string;
  conversationFiles: number;
  conversationCount: number;
  messageCount: number;
  attachmentCount: number;
}

export async function readConversationImportMetadata(
  filePath: string
): Promise<ConversationImportMetadata | null> {
  const rawText = await fs.readFile(filePath, "utf-8");
  if (canStreamChatGptConversationsFromRaw(rawText)) {
    return summarizeChatGptConversationStream(rawText);
  }

  const raw =
    filePath.toLowerCase().endsWith(".html") ||
    filePath.toLowerCase().endsWith(".csv") ||
    looksLikeChatGptConversationArrayText(rawText)
      ? rawText
      : JSON.parse(rawText) as unknown;
  return summarizeDetectedConversationImport(detectAndParseConversationExport(raw));
}

export function summarizeDetectedConversationImport(
  detected: DetectedConversationParse
): ConversationImportMetadata | null {
  const conversations = detected.parsed.conversations;
  if (conversations.length === 0 || detected.kind === "unknown") {
    return null;
  }

  const vendorSources = uniqueValues(
    conversations.map((conversation) => conversation.source)
  ).sort();

  const sampleTitles = uniqueValues(
    conversations
      .map((conversation) => conversation.title?.trim())
      .filter((title): title is string => Boolean(title))
  ).slice(0, 5);

  const timestamps = conversations.flatMap((conversation) => collectConversationTimestamps(conversation));
  const sortedTimestamps = timestamps.sort();

  const topicCounts = new Map<string, number>();
  let messageCount = 0;
  let participantCount = 0;
  let attachmentCount = 0;

  for (const conversation of conversations) {
    messageCount += conversation.messages.length;
    participantCount += conversation.participants.length;

    for (const message of conversation.messages) {
      attachmentCount += message.attachments?.length ?? 0;
    }

    const segments = segmentConversation(conversation);
    for (const segment of segments) {
      const topicHint = summarizeSegmentTopicHint(segment);
      if (!topicHint) continue;
      topicCounts.set(topicHint, (topicCounts.get(topicHint) ?? 0) + 1);
    }
  }

  const topicHints = [...topicCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 6)
    .map(([topic]) => topic);
  const detectedLabel = buildConversationImportDisplayLabel(detected.kind, vendorSources);
  const supportTier = classifyConversationSupportTier(detected.kind, vendorSources);

  return {
    sourceCategory: "conversation",
    detectedKind: detected.kind,
    detectedLabel,
    supportTier,
    conversationIds: conversations.map((conversation) => conversation.id),
    vendorSources,
    conversationCount: conversations.length,
    messageCount,
    participantCount,
    attachmentCount,
    startedAt: sortedTimestamps[0],
    endedAt: sortedTimestamps[sortedTimestamps.length - 1],
    sampleTitles,
    topicHints
  };
}

function summarizeChatGptConversationStream(rawText: string): ConversationImportMetadata | null {
  return summarizeConversationCollection(
    iterateChatGptConversationsFromRaw(rawText),
    "chatgpt_export",
    "ChatGPT export",
    "mvp_first_class"
  );
}

function summarizeConversationCollection(
  conversations: Iterable<Conversation>,
  detectedKind: ConversationParserKind,
  detectedLabel: string,
  supportTier: ImportSupportTier
): ConversationImportMetadata | null {
  const conversationIds: string[] = [];
  const vendorSources: Conversation["source"][] = [];
  const sampleTitles: string[] = [];
  const timestamps: string[] = [];
  const topicCounts = new Map<string, number>();
  let messageCount = 0;
  let participantCount = 0;
  let attachmentCount = 0;

  for (const conversation of conversations) {
    conversationIds.push(conversation.id);
    vendorSources.push(conversation.source);

    const title = conversation.title?.trim();
    if (title && !sampleTitles.includes(title) && sampleTitles.length < 5) {
      sampleTitles.push(title);
    }

    timestamps.push(...collectConversationTimestamps(conversation));
    messageCount += conversation.messages.length;
    participantCount += conversation.participants.length;

    for (const message of conversation.messages) {
      attachmentCount += message.attachments?.length ?? 0;
    }

    const segments = segmentConversation(conversation);
    for (const segment of segments) {
      const topicHint = summarizeSegmentTopicHint(segment);
      if (!topicHint) continue;
      topicCounts.set(topicHint, (topicCounts.get(topicHint) ?? 0) + 1);
    }
  }

  if (conversationIds.length === 0) {
    return null;
  }

  const sortedTimestamps = timestamps.sort();
  const topicHints = [...topicCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 6)
    .map(([topic]) => topic);

  return {
    sourceCategory: "conversation",
    detectedKind,
    detectedLabel,
    supportTier,
    conversationIds,
    vendorSources: uniqueValues(vendorSources).sort(),
    conversationCount: conversationIds.length,
    messageCount,
    participantCount,
    attachmentCount,
    startedAt: sortedTimestamps[0],
    endedAt: sortedTimestamps[sortedTimestamps.length - 1],
    sampleTitles,
    topicHints
  };
}

function summarizeSegmentTopicHint(
  segment: ReturnType<typeof segmentConversation>[number]
): string | null {
  if (segment.summaryLabel?.trim()) {
    return segment.summaryLabel.trim();
  }

  if (segment.topic && segment.topic !== "general") {
    return formatNormalizedTopicLabel(segment.topic).trim();
  }

  const raw = segment.rawTopic?.trim();
  return raw ? raw : null;
}

export function formatVendorSourceLabel(source: Conversation["source"]): string {
  switch (source) {
    case "chatgpt":
      return "ChatGPT";
    case "claude":
      return "Claude";
    case "gemini":
      return "Gemini";
    case "grok":
      return "Grok";
    case "copilot":
      return "Microsoft Copilot";
    default:
      return "Generic";
  }
}

export function formatVendorSourceList(
  sources: Conversation["source"][]
): string {
  return uniqueValues(sources)
    .map((source) => formatVendorSourceLabel(source))
    .join(", ");
}

export function formatSupportTierLabel(tier: ImportSupportTier): string {
  switch (tier) {
    case "mvp_first_class":
      return "MVP first-class";
    case "mvp_compatibility_fallback":
      return "Compatibility fallback";
    case "experimental_expansion":
      return "Experimental expansion";
    default:
      return "Unsupported";
  }
}

export function sortSupportTiers(tiers: ImportSupportTier[]): ImportSupportTier[] {
  const order: Record<ImportSupportTier, number> = {
    mvp_first_class: 0,
    mvp_compatibility_fallback: 1,
    experimental_expansion: 2,
    unsupported: 3
  };

  return [...tiers].sort((a, b) => order[a] - order[b]);
}

export function classifyConversationSupportTier(
  kind: ConversationParserKind,
  vendorSources: Conversation["source"][]
): ImportSupportTier {
  if (
    kind === "chatgpt_export" ||
    kind === "grok_export" ||
    kind === "claude_export" ||
    kind === "gemini_export" ||
    kind === "copilot_activity_csv"
  ) {
    return "mvp_first_class";
  }

  if (kind === "gemini_activity_html") {
    return "mvp_compatibility_fallback";
  }

  const namedSources = uniqueValues(vendorSources.filter((source) => source !== "generic"));
  if (namedSources.length === 0) {
    return "experimental_expansion";
  }

  const fallbackOnlySources = namedSources.filter((source) =>
    source === "claude" || source === "gemini" || source === "copilot"
  );

  if (fallbackOnlySources.length === namedSources.length) {
    return "mvp_compatibility_fallback";
  }

  return "experimental_expansion";
}

function buildConversationImportDisplayLabel(
  kind: ConversationParserKind,
  vendorSources: Conversation["source"][]
): string {
  if (kind === "chatgpt_export") {
    return "ChatGPT export";
  }

  if (kind === "grok_export") {
    return "Grok export";
  }

  if (kind === "claude_export") {
    return "Claude export";
  }

  if (kind === "gemini_export") {
    return "Gemini export";
  }

  if (kind === "gemini_activity_html") {
    return "Gemini My Activity export";
  }

  if (kind === "copilot_activity_csv") {
    return "Microsoft Copilot activity export";
  }

  const namedSources = vendorSources.filter((source) => source !== "generic");
  if (namedSources.length > 0) {
    return formatVendorSourceList(namedSources) + " conversation JSON";
  }

  return "Generic conversation JSON";
}

export function buildImportRunRetrievalSummary(
  results: ImportRunFileResult[]
): ImportRunRetrievalSummary | null {
  const conversationMetadata = results
    .filter(
      (result) =>
        result.status === "imported" ||
        (
          result.status === "skipped" &&
          result.message.toLowerCase().includes("already imported successfully")
        )
    )
    .map((result) => result.metadata)
    .filter((metadata): metadata is ConversationImportMetadata => metadata?.sourceCategory === "conversation");

  if (conversationMetadata.length === 0) {
    return null;
  }

  const vendorSources = uniqueValues(
    conversationMetadata.flatMap((metadata) => metadata.vendorSources)
  ).sort();
  const supportTiers = sortSupportTiers(
    uniqueValues(conversationMetadata.map((metadata) => metadata.supportTier))
  );

  const topicCounts = new Map<string, number>();
  const timestamps = conversationMetadata
    .flatMap((metadata) => [metadata.startedAt, metadata.endedAt])
    .filter((timestamp): timestamp is string => Boolean(timestamp))
    .sort();

  let conversationCount = 0;
  let messageCount = 0;
  let attachmentCount = 0;

  for (const metadata of conversationMetadata) {
    conversationCount += metadata.conversationCount;
    messageCount += metadata.messageCount;
    attachmentCount += metadata.attachmentCount;

    for (const topic of metadata.topicHints) {
      topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1);
    }
  }

  const topicHints = [...topicCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8)
    .map(([topic]) => topic);

  return {
    supportTiers,
    vendorSources,
    topicHints,
    startedAt: timestamps[0],
    endedAt: timestamps[timestamps.length - 1],
    conversationFiles: conversationMetadata.length,
    conversationCount,
    messageCount,
    attachmentCount
  };
}

function collectConversationTimestamps(conversation: Conversation): string[] {
  const values = [
    conversation.createdAt,
    ...conversation.messages.map((message) => message.timestamp)
  ];

  return values
    .filter((value): value is string => isValidTimestamp(value))
    .sort();
}

function isValidTimestamp(value: string | undefined): value is string {
  if (!value) return false;
  return !Number.isNaN(Date.parse(value));
}

function uniqueValues<T>(values: T[]): T[] {
  return [...new Set(values)];
}
