import path from "node:path";
import { ensureDir, fileExists, writeTextFile } from "../utils/fs.js";
import type { ConversationSegment } from "./segmenter.js";

export interface PurgeRecord {
  purged_at: string;
  conversation_id: string;
  title?: string;
  topic: string;
  raw_topic: string;
  reason: string;
  output_file: string;
  start_index: number;
  end_index: number;
  message_count: number;
}

async function appendJsonl(filePath: string, line: string): Promise<void> {
  await ensureDir(path.dirname(filePath));

  let existing = "";
  if (await fileExists(filePath)) {
    const fs = await import("node:fs/promises");
    existing = await fs.readFile(filePath, "utf-8");
  }

  const content =
    existing +
    (existing && !existing.endsWith("\n") ? "\n" : "") +
    line +
    "\n";

  await writeTextFile(filePath, content);
}

export async function recordPurge(
  rootOutputDir: string,
  segment: ConversationSegment,
  reason: string,
  outputFile: string
): Promise<void> {
  const record: PurgeRecord = {
    purged_at: new Date().toISOString(),
    conversation_id: segment.conversationId,
    title: segment.title,
    topic: segment.topic,
    raw_topic: segment.rawTopic,
    reason,
    output_file: outputFile,
    start_index: segment.startIndex,
    end_index: segment.endIndex,
    message_count: segment.messages.length
  };

  const manifestPath = path.join(rootOutputDir, "purge", "purge-manifest.jsonl");
  await appendJsonl(manifestPath, JSON.stringify(record));
}
