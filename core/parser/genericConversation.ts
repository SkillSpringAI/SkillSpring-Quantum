import { randomUUID } from "node:crypto";
import type { Conversation, ConversationAttachment, ConversationMessage, ParseResult, Role } from "./types.js";

interface GenericMessageLike {
  id?: string;
  uuid?: string;
  role?: string;
  author?: string;
  speaker?: string;
  sender?: string;
  source?: string;
  type?: string;
  content?: unknown;
  text?: unknown;
  markdown?: unknown;
  message?: unknown;
  body?: unknown;
  parts?: unknown;
  blocks?: unknown;
  chunks?: unknown;
  candidate?: unknown;
  response?: unknown;
  timestamp?: string | number;
  created_at?: string | number;
  createdAt?: string | number;
  updated_at?: string | number;
  time?: string | number;
  attachments?: unknown;
  files?: unknown;
}

interface GenericConversationLike {
  id?: string;
  uuid?: string;
  conversation_id?: string;
  title?: string;
  name?: string;
  summary?: string;
  account?: unknown;
  subject?: string;
  created_at?: string | number;
  createdAt?: string | number;
  messages?: unknown;
  entries?: unknown;
  turns?: unknown;
  chat_messages?: unknown;
  conversation?: {
    messages?: unknown;
    entries?: unknown;
    turns?: unknown;
  };
}

type InferredConversationSource = Conversation["source"];

function mapRole(role?: string): Role {
  switch ((role || "").toLowerCase()) {
    case "user":
    case "human":
    case "prompt":
    case "customer":
      return "user";
    case "assistant":
    case "model":
    case "claude":
    case "gemini":
    case "grok":
    case "kimi":
    case "deepseek":
    case "perplexity":
    case "bot":
    case "ai":
      return "assistant";
    case "system":
      return "system";
    case "tool":
    case "function":
      return "tool";
    default:
      return "unknown";
  }
}

function extractString(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    return value.map(extractString).filter(Boolean).join("\n").trim();
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (record.type === "text" && typeof record.text === "string") {
      return record.text.trim();
    }

    for (const key of ["text", "markdown", "value", "body", "message", "response", "candidate", "content", "parts", "blocks", "chunks"]) {
      if (key in record) {
        const extracted = extractString(record[key]);
        if (extracted) return extracted;
      }
    }
  }

  return "";
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

  return undefined;
}

function looksLikeMessage(value: unknown): value is GenericMessageLike {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return [
    "role",
    "author",
    "speaker",
    "sender",
    "source",
    "content",
    "text",
    "markdown",
    "message",
    "body",
    "parts",
    "blocks",
    "chunks"
  ].some((key) => key in record);
}

function toMessage(value: GenericMessageLike, index: number): ConversationMessage | null {
  const text = [
    value.text,
    value.markdown,
    value.message,
    value.body,
    value.response,
    value.candidate,
    value.content,
    value.parts,
    value.blocks,
    value.chunks
  ]
    .map(extractString)
    .find(Boolean);
  if (!text) return null;

  const attachments = extractAttachments(value);

  return {
    id: value.id ?? value.uuid ?? "message-" + index,
    role: mapRole(value.role ?? value.author ?? value.speaker ?? value.sender ?? value.source ?? value.type),
    text: normalizeWhitespace(text),
    timestamp: normalizeTimestamp(
      value.timestamp ??
      value.created_at ??
      value.createdAt ??
      value.updated_at ??
      value.time
    ),
    attachments: attachments.length > 0 ? attachments : undefined
  };
}

function parseSingleConversation(raw: GenericConversationLike, index: number): Conversation | null {
  const nestedConversation = raw.conversation;
  const messageSource =
    raw.messages ??
    raw.entries ??
    raw.turns ??
    raw.chat_messages ??
    nestedConversation?.messages ??
    nestedConversation?.entries ??
    nestedConversation?.turns;
  if (!Array.isArray(messageSource)) return null;

  const messages = messageSource
    .filter(looksLikeMessage)
    .map((message, messageIndex) => toMessage(message, messageIndex))
    .filter((message): message is ConversationMessage => message !== null);

  if (messages.length === 0) return null;

  messages.sort((a, b) => {
    const aTime = a.timestamp ? Date.parse(a.timestamp) : 0;
    const bTime = b.timestamp ? Date.parse(b.timestamp) : 0;
    return aTime - bTime;
  });

  const createdAt = normalizeTimestamp(raw.created_at ?? raw.createdAt) ?? messages.find((message) => message.timestamp)?.timestamp;

  return {
    id: raw.conversation_id ?? raw.id ?? raw.uuid ?? randomUUID(),
    source: inferConversationSource(raw, messages),
    title: raw.title ?? raw.name ?? raw.subject ?? "Imported Conversation " + (index + 1),
    createdAt,
    participants: ["user", "assistant"],
    messages
  };
}

function looksLikeConversation(value: unknown): value is GenericConversationLike {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if (["messages", "entries", "turns", "chat_messages"].some((key) => Array.isArray(record[key]))) {
    return true;
  }

  if (record.conversation && typeof record.conversation === "object") {
    const nested = record.conversation as Record<string, unknown>;
    return ["messages", "entries", "turns"].some((key) => Array.isArray(nested[key]));
  }

  return false;
}

export function parseGenericConversationExport(raw: unknown): ParseResult {
  if (Array.isArray(raw)) {
    const conversations = raw
      .filter(looksLikeConversation)
      .map(parseSingleConversation)
      .filter((conversation): conversation is Conversation => conversation !== null);

    if (conversations.length > 0) {
      return { conversations };
    }

    const directMessages = raw.filter(looksLikeMessage);
    if (directMessages.length > 0) {
      const single = parseSingleConversation({ messages: directMessages, title: "Imported Conversation" }, 0);
      return { conversations: single ? [single] : [] };
    }
  }

  if (looksLikeConversation(raw)) {
    const single = parseSingleConversation(raw, 0);
    return { conversations: single ? [single] : [] };
  }

  if (raw && typeof raw === "object") {
    const record = raw as Record<string, unknown>;

    for (const key of ["conversations", "items", "data", "chats"]) {
      if (Array.isArray(record[key])) {
        const parsed = parseGenericConversationExport(record[key]);
        if (parsed.conversations.length > 0) {
          return parsed;
        }
      }
    }
  }

  return { conversations: [] };
}

function normalizeWhitespace(value: string): string {
  return value
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function inferConversationSource(
  raw: GenericConversationLike,
  messages: ConversationMessage[]
): InferredConversationSource {
  if (
    Array.isArray(raw.chat_messages) &&
    raw.account &&
    typeof raw.account === "object" &&
    (typeof raw.name === "string" || typeof raw.summary === "string")
  ) {
    return "claude";
  }

  const candidates = [
    raw.title,
    raw.name,
    raw.summary,
    raw.subject,
    ...messages.slice(0, 4).map((message) => message.text.slice(0, 160))
  ]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ")
    .toLowerCase();

  if (candidates.includes("claude")) return "claude";
  if (candidates.includes("gemini")) return "gemini";
  if (candidates.includes("grok")) return "grok";
  if (candidates.includes("copilot")) return "copilot";

  return "generic";
}

function extractAttachments(value: GenericMessageLike): ConversationAttachment[] {
  const attachments = [
    ...extractAttachmentArray(value.attachments),
    ...extractAttachmentArray(value.files)
  ];
  const seen = new Set<string>();

  return attachments.filter((attachment) => {
    if (seen.has(attachment.id)) {
      return false;
    }

    seen.add(attachment.id);
    return true;
  });
}

function extractAttachmentArray(value: unknown): ConversationAttachment[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry, index) => toAttachment(entry, index))
    .filter((attachment): attachment is ConversationAttachment => attachment !== null);
}

function toAttachment(value: unknown, index: number): ConversationAttachment | null {
  if (typeof value === "string" && value.trim().length > 0) {
    return {
      id: value.trim(),
      label: "Attachment " + (index + 1)
    };
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const idCandidate = [record.file_uuid, record.uuid, record.id, record.file_name]
    .find((entry) => typeof entry === "string" && entry.trim().length > 0);

  if (typeof idCandidate !== "string") {
    return null;
  }

  const labelCandidate = [record.file_name, record.name, record.title]
    .find((entry) => typeof entry === "string" && entry.trim().length > 0);
  const mimeTypeCandidate = [record.file_type, record.mime_type, record.mimeType]
    .find((entry) => typeof entry === "string" && entry.trim().length > 0);

  return {
    id: idCandidate.trim(),
    label: typeof labelCandidate === "string" ? labelCandidate.trim() : undefined,
    mimeType: typeof mimeTypeCandidate === "string" ? mimeTypeCandidate.trim() : undefined
  };
}
