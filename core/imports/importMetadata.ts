import { promises as fs } from "node:fs";
import type { ConversationParserKind, DetectedConversationParse } from "../parser/detectConversationExport.js";
import { detectAndParseConversationExport } from "../parser/index.js";
import type { Conversation } from "../parser/types.js";
import { segmentConversation } from "../pipeline/segmenter.js";
import type { ImportSourceKind, ImportRunFileResult } from "./sourceIntake.js";

export interface ConversationImportMetadata {
  sourceCategory: "conversation";
  detectedKind: ConversationParserKind;
  detectedLabel: string;
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
  sourceKind: Exclude<ImportSourceKind, "chatgpt_export" | "conversation_json" | "unsupported">;
  fileExtension: string;
  sizeBytes: number;
  parseStatus: "text_extracted" | "binary_archived_only";
  textLength: number;
}

export type ImportFileMetadata = ConversationImportMetadata | DocumentImportMetadata;

export interface ImportRunRetrievalSummary {
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
  const raw = JSON.parse(await fs.readFile(filePath, "utf-8")) as unknown;
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
      if (!segment.topic || segment.topic === "general") continue;
      topicCounts.set(segment.topic, (topicCounts.get(segment.topic) ?? 0) + 1);
    }
  }

  const topicHints = [...topicCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 6)
    .map(([topic]) => topic);
  const detectedLabel = buildConversationImportDisplayLabel(detected.kind, vendorSources);

  return {
    sourceCategory: "conversation",
    detectedKind: detected.kind,
    detectedLabel,
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
    .map((result) => result.metadata)
    .filter((metadata): metadata is ConversationImportMetadata => metadata?.sourceCategory === "conversation");

  if (conversationMetadata.length === 0) {
    return null;
  }

  const vendorSources = uniqueValues(
    conversationMetadata.flatMap((metadata) => metadata.vendorSources)
  ).sort();

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
