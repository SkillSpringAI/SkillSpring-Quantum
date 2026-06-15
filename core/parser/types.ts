export type Role = "user" | "assistant" | "system" | "tool" | "unknown";

export interface ConversationMessage {
  id?: string;
  role: Role;
  text: string;
  timestamp?: string;
}

export interface Conversation {
  id: string;
  source: "chatgpt" | "claude" | "gemini" | "generic";
  title?: string;
  createdAt?: string;
  participants: string[];
  messages: ConversationMessage[];
}

export interface ParseResult {
  conversations: Conversation[];
}
