import type { Conversation } from "../parser/types.js";

export interface ClassificationResult {
  topic: string;
  confidence: number;
}

export function classifyConversation(_conversation: Conversation): ClassificationResult | null {
  return null;
}
