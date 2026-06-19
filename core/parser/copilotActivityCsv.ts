import { createHash } from "node:crypto";
import type { Conversation, ConversationMessage, ParseResult, Role } from "./types.js";

interface CopilotRow {
  Conversation: string;
  Time: string;
  Author: string;
  Message: string;
}

export function parseCopilotActivityCsv(raw: unknown): ParseResult {
  if (typeof raw !== "string") {
    return { conversations: [] };
  }

  const rows = parseCopilotRows(raw);
  if (rows.length === 0) {
    return { conversations: [] };
  }

  const conversations = new Map<string, CopilotRow[]>();
  for (const row of rows) {
    const title = row.Conversation.trim();
    if (!conversations.has(title)) {
      conversations.set(title, []);
    }
    conversations.get(title)?.push(row);
  }

  return {
    conversations: [...conversations.entries()]
      .map(([title, conversationRows]) => buildConversation(title, conversationRows))
      .filter((conversation): conversation is Conversation => conversation !== null)
  };
}

function buildConversation(title: string, rows: CopilotRow[]): Conversation | null {
  const messages = rows
    .map((row, index) => toMessage(row, index))
    .filter((message): message is ConversationMessage => message !== null);

  if (messages.length === 0) {
    return null;
  }

  messages.sort((a, b) => compareMessages(a, b));

  return {
    id: "copilot-" + createHash("sha256").update(title + "|" + (messages[0].timestamp ?? "")).digest("hex").slice(0, 16),
    source: "copilot",
    title,
    createdAt: messages.find((message) => message.timestamp)?.timestamp,
    participants: ["user", "assistant"],
    messages
  };
}

function toMessage(row: CopilotRow, index: number): ConversationMessage | null {
  const text = normalizeWhitespace(row.Message);
  if (!text) {
    return null;
  }

  const role = mapAuthorToRole(row.Author);
  if (role === "unknown") {
    return null;
  }

  const timestamp = normalizeTimestamp(row.Time);

  return {
    id: "copilot-message-" + index,
    role,
    text,
    timestamp
  };
}

function mapAuthorToRole(author: string): Role {
  switch (author.trim().toLowerCase()) {
    case "human":
      return "user";
    case "ai":
      return "assistant";
    default:
      return "unknown";
  }
}

function normalizeTimestamp(value: string): string | undefined {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? undefined : new Date(parsed).toISOString();
}

function compareMessages(a: ConversationMessage, b: ConversationMessage): number {
  const aTime = a.timestamp ? Date.parse(a.timestamp) : 0;
  const bTime = b.timestamp ? Date.parse(b.timestamp) : 0;

  if (aTime !== bTime) {
    return aTime - bTime;
  }

  const aRank = a.role === "user" ? 0 : a.role === "assistant" ? 1 : 2;
  const bRank = b.role === "user" ? 0 : b.role === "assistant" ? 1 : 2;
  return aRank - bRank;
}

function normalizeWhitespace(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseCopilotRows(raw: string): CopilotRow[] {
  const table = parseCsvTable(raw);
  if (table.length < 2) {
    return [];
  }

  const [header, ...body] = table;
  if (!looksLikeCopilotHeader(header)) {
    return [];
  }

  return body
    .filter((row) => row.length >= 4)
    .map((row) => ({
      Conversation: row[0] ?? "",
      Time: row[1] ?? "",
      Author: row[2] ?? "",
      Message: row.slice(3).join(",")
    }))
    .filter((row) =>
      row.Conversation.trim().length > 0 &&
      row.Time.trim().length > 0 &&
      row.Author.trim().length > 0 &&
      row.Message.trim().length > 0
    );
}

function looksLikeCopilotHeader(header: string[]): boolean {
  return header.length >= 4 &&
    header[0] === "Conversation" &&
    header[1] === "Time" &&
    header[2] === "Author" &&
    header[3] === "Message";
}

function parseCsvTable(raw: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];
    const next = raw[index + 1];

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        currentCell += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      currentRow.push(currentCell);
      currentCell = "";
      if (currentRow.length > 1 || currentRow[0]?.length) {
        rows.push(currentRow);
      }
      currentRow = [];
      continue;
    }

    currentCell += char;
  }

  currentRow.push(currentCell);
  if (currentRow.length > 1 || currentRow[0]?.length) {
    rows.push(currentRow);
  }

  return rows;
}
