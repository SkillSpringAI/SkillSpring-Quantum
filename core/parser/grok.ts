import { randomUUID } from "node:crypto";
import type { Conversation, ConversationAttachment, ConversationMessage, ParseResult, Role } from "./types.js";

interface GrokTimestampRecord {
  $date?: {
    $numberLong?: string;
  } | string;
}

interface GrokResponseRecord {
  _id?: string;
  conversation_id?: string;
  message?: unknown;
  sender?: string;
  create_time?: unknown;
  file_attachments?: unknown;
}

interface GrokConversationRecord {
  id?: string;
  title?: string;
  create_time?: unknown;
}

interface GrokConversationEntry {
  conversation?: GrokConversationRecord;
  responses?: Array<{
    response?: GrokResponseRecord;
  }>;
}

interface GrokExportLike {
  conversations?: unknown;
}

function mapRole(sender?: string): Role {
  switch ((sender || "").toLowerCase()) {
    case "human":
    case "user":
      return "user";
    case "assistant":
      return "assistant";
    case "system":
      return "system";
    case "tool":
      return "tool";
    default:
      return "unknown";
  }
}

function normalizeTimestamp(value: unknown): string | undefined {
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? undefined : new Date(parsed).toISOString();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const millis = value > 1e12 ? value : value * 1000;
    return new Date(millis).toISOString();
  }

  if (value && typeof value === "object") {
    const record = value as GrokTimestampRecord;
    if (typeof record.$date === "string") {
      return normalizeTimestamp(record.$date);
    }

    if (record.$date && typeof record.$date === "object" && typeof record.$date.$numberLong === "string") {
      const millis = Number(record.$date.$numberLong);
      if (Number.isFinite(millis)) {
        return new Date(millis).toISOString();
      }
    }
  }

  return undefined;
}

function extractText(value: unknown): string {
  if (typeof value === "string") {
    return normalizeWhitespace(
      value
        .replace(/<grok:render\b[^>]*>[\s\S]*?<\/grok:render>/gi, "")
        .replace(/<argument\b[^>]*>[\s\S]*?<\/argument>/gi, "")
    );
  }

  if (Array.isArray(value)) {
    return normalizeWhitespace(value.map(extractText).filter(Boolean).join("\n"));
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["text", "message", "content", "body", "markdown"]) {
      if (key in record) {
        const extracted = extractText(record[key]);
        if (extracted) return extracted;
      }
    }
  }

  return "";
}

function toMessage(response: GrokResponseRecord, index: number): ConversationMessage | null {
  const text = extractText(response.message);
  if (!text) return null;

  const attachments = extractAttachments(response.file_attachments);

  return {
    id: response._id || "message-" + index,
    role: mapRole(response.sender),
    text,
    timestamp: normalizeTimestamp(response.create_time),
    attachments: attachments.length > 0 ? attachments : undefined
  };
}

function parseConversation(entry: GrokConversationEntry): Conversation | null {
  if (!entry.conversation || !Array.isArray(entry.responses)) {
    return null;
  }

  const messages = entry.responses
    .map((item, index) => toMessage(item.response || {}, index))
    .filter((message): message is ConversationMessage => message !== null);

  if (messages.length === 0) {
    return null;
  }

  messages.sort((a, b) => {
    const aTime = a.timestamp ? Date.parse(a.timestamp) : 0;
    const bTime = b.timestamp ? Date.parse(b.timestamp) : 0;
    return aTime - bTime;
  });

  return {
    id: entry.conversation.id || randomUUID(),
    source: "grok",
    title: entry.conversation.title || "Imported Grok Conversation",
    createdAt:
      normalizeTimestamp(entry.conversation.create_time) ??
      messages.find((message) => message.timestamp)?.timestamp,
    participants: ["user", "assistant"],
    messages
  };
}

function looksLikeGrokExport(raw: unknown): raw is GrokExportLike {
  if (!raw || typeof raw !== "object") return false;
  const record = raw as Record<string, unknown>;
  return Array.isArray(record.conversations);
}

function extractAttachments(value: unknown): ConversationAttachment[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((id, index) => ({
      id,
      label: "Attachment " + (index + 1)
    }));
}

export function parseGrokExport(raw: unknown): ParseResult {
  if (!looksLikeGrokExport(raw)) {
    return { conversations: [] };
  }

  const conversationEntries = raw.conversations as unknown[];
  const conversations = conversationEntries
    .filter((entry): entry is GrokConversationEntry => !!entry && typeof entry === "object")
    .map(parseConversation)
    .filter((conversation): conversation is Conversation => conversation !== null);

  return { conversations };
}

function normalizeWhitespace(value: string): string {
  return value
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
