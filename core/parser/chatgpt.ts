import { randomUUID } from "node:crypto";
import type { Conversation, ConversationMessage, ParseResult, Role } from "./types.js";

interface ChatGPTMessageContent {
  parts?: unknown[];
  content_type?: string;
}

interface ChatGPTMessage {
  author?: {
    role?: string;
  };
  content?: ChatGPTMessageContent;
  create_time?: number;
}

interface ChatGPTNode {
  id?: string;
  message?: ChatGPTMessage;
  parent?: string | null;
  children?: string[];
}

interface ChatGPTConversationLike {
  title?: string;
  create_time?: number;
  conversation_id?: string;
  id?: string;
  mapping?: Record<string, ChatGPTNode>;
}

function mapRole(role?: string): Role {
  switch (role) {
    case "user":
    case "assistant":
    case "system":
    case "tool":
      return role;
    default:
      return "unknown";
  }
}

function extractTextFromPart(part: unknown): string[] {
  if (typeof part === "string") {
    return [part];
  }

  if (Array.isArray(part)) {
    return part.flatMap(extractTextFromPart);
  }

  if (part && typeof part === "object") {
    const record = part as Record<string, unknown>;

    if (typeof record.text === "string") {
      return [record.text];
    }

    if (Array.isArray(record.text)) {
      return record.text.flatMap(extractTextFromPart);
    }

    if (typeof record.result === "string") {
      return [record.result];
    }
  }

  return [];
}

function extractText(parts?: unknown[]): string {
  if (!Array.isArray(parts)) return "";

  const lines = parts.flatMap(extractTextFromPart)
    .map(x => x.trim())
    .filter(Boolean);

  return lines.join("\n").trim();
}

function parseSingleConversation(raw: ChatGPTConversationLike): Conversation | null {
  const mapping = raw.mapping ?? {};
  const messages: ConversationMessage[] = [];

  for (const node of Object.values(mapping)) {
    const message = node.message;
    if (!message) continue;

    const text = extractText(message.content?.parts);
    if (!text) continue;

    messages.push({
      id: node.id,
      role: mapRole(message.author?.role),
      text,
      timestamp: message.create_time
        ? new Date(message.create_time * 1000).toISOString()
        : undefined
    });
  }

  if (messages.length === 0) {
    return null;
  }

  messages.sort((a, b) => {
    const aTime = a.timestamp ? Date.parse(a.timestamp) : 0;
    const bTime = b.timestamp ? Date.parse(b.timestamp) : 0;
    return aTime - bTime;
  });

  const createdAt =
    raw.create_time
      ? new Date(raw.create_time * 1000).toISOString()
      : messages.find(m => m.timestamp)?.timestamp;

  return {
    id: raw.conversation_id ?? raw.id ?? randomUUID(),
    source: "chatgpt",
    title: raw.title ?? "Untitled Conversation",
    createdAt,
    participants: ["user", "assistant"],
    messages
  };
}

function looksLikeConversationObject(value: unknown): value is ChatGPTConversationLike {
  return Boolean(
    value &&
    typeof value === "object" &&
    "mapping" in (value as Record<string, unknown>)
  );
}

export function parseChatGPTExport(raw: unknown): ParseResult {
  if (Array.isArray(raw)) {
    const conversations = raw
      .filter(looksLikeConversationObject)
      .map(parseSingleConversation)
      .filter((c): c is Conversation => c !== null);

    return { conversations };
  }

  if (looksLikeConversationObject(raw)) {
    const conversation = parseSingleConversation(raw);
    return {
      conversations: conversation ? [conversation] : []
    };
  }

  if (raw && typeof raw === "object") {
    const record = raw as Record<string, unknown>;

    for (const key of ["conversations", "items", "data"]) {
      const candidate = record[key];
      if (Array.isArray(candidate)) {
        return parseChatGPTExport(candidate);
      }
    }
  }

  return { conversations: [] };
}
