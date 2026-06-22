import type { ParseResult } from "./types.js";
import { parseClaudeExport, isClaudeExportShape } from "./claude.js";
import { parseGeminiExport, isGeminiExportShape } from "./gemini.js";
import { parseChatGPTExport } from "./chatgpt.js";
import { parseCopilotActivityCsv } from "./copilotActivityCsv.js";
import { parseGeminiActivityHtml } from "./geminiActivityHtml.js";
import { parseGenericConversationExport } from "./genericConversation.js";
import { parseGrokExport } from "./grok.js";

export type ConversationParserKind =
  | "chatgpt_export"
  | "grok_export"
  | "claude_export"
  | "gemini_export"
  | "copilot_activity_csv"
  | "gemini_activity_html"
  | "generic_conversation"
  | "unknown";

export interface DetectedConversationParse {
  kind: ConversationParserKind;
  label: string;
  parsed: ParseResult;
  diagnostics: ConversationDetectionDiagnostics;
}

export interface ConversationDetectionDiagnostics {
  topLevelKeys: string[];
  matchedPath: string | null;
  candidateContainers: string[];
  candidateMessageKeys: string[];
}

export function detectAndParseConversationExport(raw: unknown): DetectedConversationParse {
  const diagnostics = inspectConversationExportShape(raw);

  const geminiActivity = parseGeminiActivityHtml(raw);
  if (geminiActivity.conversations.length > 0) {
    return {
      kind: "gemini_activity_html",
      label: "Gemini My Activity export",
      parsed: geminiActivity,
      diagnostics: {
        ...diagnostics,
        matchedPath: diagnostics.matchedPath ?? "html.activity_cards"
      }
    };
  }

  const copilotCsv = parseCopilotActivityCsv(raw);
  if (copilotCsv.conversations.length > 0) {
    return {
      kind: "copilot_activity_csv",
      label: "Microsoft Copilot activity export",
      parsed: copilotCsv,
      diagnostics: {
        ...diagnostics,
        matchedPath: diagnostics.matchedPath ?? "csv.rows"
      }
    };
  }

  const chatgpt = parseChatGPTExport(raw);
  if (chatgpt.conversations.length > 0) {
    return {
      kind: "chatgpt_export",
      label: "ChatGPT export",
      parsed: chatgpt,
      diagnostics: {
        ...diagnostics,
        matchedPath: diagnostics.matchedPath ?? "mapping"
      }
    };
  }

  const grok = parseGrokExport(raw);
  if (grok.conversations.length > 0) {
    return {
      kind: "grok_export",
      label: "Grok export",
      parsed: grok,
      diagnostics: {
        ...diagnostics,
        matchedPath: diagnostics.matchedPath ?? "conversations"
      }
    };
  }

  const claude = parseClaudeExport(raw);
  if (claude.conversations.length > 0) {
    return {
      kind: "claude_export",
      label: "Claude export",
      parsed: claude,
      diagnostics: {
        ...diagnostics,
        matchedPath: diagnostics.matchedPath ?? "[0].chat_messages"
      }
    };
  }

  const gemini = parseGeminiExport(raw);
  if (gemini.conversations.length > 0) {
    return {
      kind: "gemini_export",
      label: "Gemini export",
      parsed: gemini,
      diagnostics: {
        ...diagnostics,
        matchedPath: diagnostics.matchedPath ?? "messages"
      }
    };
  }

  const generic = parseGenericConversationExport(raw);

  if (generic.conversations.length > 0) {
    return {
      kind: "generic_conversation",
      label: "generic conversation JSON",
      parsed: generic,
      diagnostics
    };
  }

  return {
    kind: "unknown",
    label: "unknown conversation export",
    parsed: { conversations: [] },
    diagnostics
  };
}

export function inspectConversationExportShape(raw: unknown): ConversationDetectionDiagnostics {
  if (typeof raw === "string") {
    const normalized = raw.slice(0, 256).toLowerCase();
    return {
      topLevelKeys: [],
      matchedPath: raw.includes("Gemini Apps Activity")
        ? "html.activity_cards"
        : normalized.startsWith("conversation,time,author,message")
          ? "csv.rows"
          : null,
      candidateContainers: raw.includes("outer-cell")
        ? ["html.outer-cell"]
        : normalized.startsWith("conversation,time,author,message")
          ? ["csv.rows"]
          : [],
      candidateMessageKeys: raw.includes("Prompted")
        ? ["prompted", "html"]
        : normalized.startsWith("conversation,time,author,message")
          ? ["author", "conversation", "message", "time"]
          : []
    };
  }

  const topLevelKeys = raw && typeof raw === "object" && !Array.isArray(raw)
    ? Object.keys(raw as Record<string, unknown>).slice(0, 24)
    : [];

  const candidateContainers = findContainerPaths(raw);
  const candidateMessageKeys = findMessageKeyCandidates(raw);

  return {
    topLevelKeys,
    matchedPath: isClaudeExportShape(raw)
      ? "[0].chat_messages"
      : isGeminiExportShape(raw)
        ? "messages"
      : candidateContainers[0] ?? null,
    candidateContainers,
    candidateMessageKeys
  };
}

function findContainerPaths(raw: unknown): string[] {
  const results: string[] = [];

  visitObject(raw, "", (value, path) => {
    if (!value || typeof value !== "object") return;
    const record = value as Record<string, unknown>;

    if ("mapping" in record && typeof record.mapping === "object") {
      results.push(path ? path + ".mapping" : "mapping");
    }

    for (const key of ["messages", "entries", "turns", "chat_messages", "conversations", "items", "data", "chats"]) {
      if (Array.isArray(record[key])) {
        results.push(path ? path + "." + key : key);
      }
    }

    if ("responses" in record && Array.isArray(record.responses)) {
      results.push(path ? path + ".responses" : "responses");
    }
  });

  return [...new Set(results)].slice(0, 20);
}

function findMessageKeyCandidates(raw: unknown): string[] {
  const keys = new Set<string>();

  visitObject(raw, "", (value) => {
    if (!value || typeof value !== "object") return;
    const record = value as Record<string, unknown>;

    for (const key of [
      "role",
      "author",
      "speaker",
      "sender",
      "source",
      "content",
      "text",
      "message",
      "markdown",
      "body",
      "parts",
      "blocks",
      "chunks",
      "candidate",
      "response",
      "timestamp",
      "created_at",
      "createdAt",
      "create_time",
      "time"
    ]) {
      if (key in record) {
        keys.add(key);
      }
    }
  });

  return [...keys].sort();
}

function visitObject(
  value: unknown,
  path: string,
  visitor: (value: unknown, path: string) => void
): void {
  visitor(value, path);

  if (Array.isArray(value)) {
    value.slice(0, 8).forEach((item, index) => {
      visitObject(item, path ? path + "[" + index + "]" : "[" + index + "]", visitor);
    });
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  const entries = Object.entries(value as Record<string, unknown>).slice(0, 16);
  for (const [key, child] of entries) {
    visitObject(child, path ? path + "." + key : key, visitor);
  }
}
