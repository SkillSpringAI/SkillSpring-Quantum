import { parseGenericConversationExport } from "./genericConversation.js";
import type { ParseResult } from "./types.js";

export function parseGeminiExport(raw: unknown): ParseResult {
  if (!isGeminiExportShape(raw)) {
    return { conversations: [] };
  }

  return parseGenericConversationExport(raw);
}

export function isGeminiExportShape(raw: unknown): boolean {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return false;
  }

  const record = raw as Record<string, unknown>;
  if (
    record.platform !== "gemini" ||
    typeof record.url !== "string" ||
    typeof record.title !== "string" ||
    !Array.isArray(record.messages)
  ) {
    return false;
  }

  const firstMessage = record.messages[0];
  if (!firstMessage || typeof firstMessage !== "object") {
    return false;
  }

  const firstMessageRecord = firstMessage as Record<string, unknown>;
  return (
    typeof firstMessageRecord.role === "string" &&
    (typeof firstMessageRecord.markdown === "string" || Array.isArray(firstMessageRecord.tokens))
  );
}
