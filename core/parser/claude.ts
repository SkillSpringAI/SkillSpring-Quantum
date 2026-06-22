import { parseGenericConversationExport } from "./genericConversation.js";
import type { ParseResult } from "./types.js";

export function parseClaudeExport(raw: unknown): ParseResult {
  if (!isClaudeExportShape(raw)) {
    return { conversations: [] };
  }

  return parseGenericConversationExport(raw);
}

export function isClaudeExportShape(raw: unknown): boolean {
  if (!Array.isArray(raw) || raw.length === 0) {
    return false;
  }

  const sample = raw[0];
  if (!sample || typeof sample !== "object") {
    return false;
  }

  const record = sample as Record<string, unknown>;
  if (
    typeof record.uuid !== "string" ||
    !Array.isArray(record.chat_messages) ||
    !record.account ||
    typeof record.account !== "object" ||
    (!("name" in record) && !("summary" in record))
  ) {
    return false;
  }

  const firstMessage = record.chat_messages[0];
  if (!firstMessage || typeof firstMessage !== "object") {
    return false;
  }

  const firstMessageRecord = firstMessage as Record<string, unknown>;
  return (
    typeof firstMessageRecord.sender === "string" &&
    "attachments" in firstMessageRecord &&
    "files" in firstMessageRecord
  );
}
