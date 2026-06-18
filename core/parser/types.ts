export type Role = "user" | "assistant" | "system" | "tool" | "unknown";

export interface ConversationAttachment {
  id: string;
  label?: string;
  mimeType?: string;
  archivePath?: string;
  previewPath?: string;
}

export interface ConversationMessage {
  id?: string;
  role: Role;
  text: string;
  timestamp?: string;
  attachments?: ConversationAttachment[];
}

export interface Conversation {
  id: string;
  source: "chatgpt" | "claude" | "gemini" | "grok" | "copilot" | "generic";
  title?: string;
  createdAt?: string;
  participants: string[];
  messages: ConversationMessage[];
}

export interface ParseResult {
  conversations: Conversation[];
}
