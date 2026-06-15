import path from "node:path";
import type { Conversation } from "../parser/types.js";
import { writeTierRecords, writeDbManifest } from "./tieredStore.js";

export interface RawConversationRecord {
  schema_version: "raw_conversation.v1";
  conversation_id: string;
  source: string;
  title?: string;
  created_at?: string;
  participants: string[];
  message_count: number;
  messages: Array<{
    id?: string;
    role: string;
    text: string;
    timestamp?: string;
  }>;
}

export interface RawIngestSummary {
  run_id: string;
  raw_conversations_seen: number;
  raw_conversations_written: number;
  raw_conversations_skipped: number;
}

export async function ingestRawConversations(
  conversations: Conversation[],
  rootOutputDir: string,
  runId: string
): Promise<RawIngestSummary> {
  const dbRoot = path.join(rootOutputDir, "db");

  const rawRecords: RawConversationRecord[] = conversations.map((conversation) => ({
    schema_version: "raw_conversation.v1",
    conversation_id: conversation.id,
    source: conversation.source,
    title: conversation.title,
    created_at: conversation.createdAt,
    participants: conversation.participants,
    message_count: conversation.messages.length,
    messages: conversation.messages.map((message) => ({
      id: message.id,
      role: message.role,
      text: message.text,
      timestamp: message.timestamp
    }))
  }));

  const writeResult = await writeTierRecords(
    dbRoot,
    "tier0_raw",
    "conversations",
    rawRecords
  );

  const summary: RawIngestSummary = {
    run_id: runId,
    raw_conversations_seen: rawRecords.length,
    raw_conversations_written: writeResult.recordsWritten,
    raw_conversations_skipped: writeResult.recordsSkipped
  };

  await writeDbManifest(dbRoot, "latest-raw-ingest.json", summary);

  return summary;
}
