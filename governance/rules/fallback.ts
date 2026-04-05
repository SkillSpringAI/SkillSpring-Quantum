import type { Conversation } from "../../core/parser/types.js";

export interface FallbackResult {
  topic: string;
  confidence: number;
  reason: string;
}

export function fallbackTopicAssignment(conversation: Conversation): FallbackResult {
  const firstUserMessage =
    conversation.messages.find(msg => msg.role === "user")?.text ?? "";

  const shortened = firstUserMessage
    .split(/\s+/)
    .slice(0, 8)
    .join("_")
    .replace(/[^\w\-]/g, "");

  return {
    topic: shortened || conversation.title || "general",
    confidence: 0.4,
    reason: "Fallback rule used because no classifier result was available."
  };
}
