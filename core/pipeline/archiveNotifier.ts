import path from "node:path";
import { appendTextFile, writeTextFile } from "../utils/fs.js";
import type { ExportResult } from "./exporter.js";
import type { ConversationSegment } from "./segmenter.js";

export interface ArchiveNotification {
  notified_at: string;
  conversation_id: string;
  title?: string;
  topic: string;
  created_at?: string;
  start_index: number;
  end_index: number;
  status: ExportResult["status"];
  output_file: string;
  hash: string;
  message: string;
}

async function appendJsonl(filePath: string, records: ArchiveNotification[]): Promise<void> {
  if (records.length === 0) return;
  const content = records.map((record) => JSON.stringify(record)).join("\n") + "\n";
  await appendTextFile(filePath, content);
}

export async function writeArchiveNotification(
  outputRoot: string,
  segment: ConversationSegment,
  exported: ExportResult
): Promise<ArchiveNotification> {
  const notification: ArchiveNotification = {
    notified_at: new Date().toISOString(),
    conversation_id: segment.conversationId,
    title: segment.title,
    topic: segment.topic,
    created_at: segment.createdAt,
    start_index: segment.startIndex,
    end_index: segment.endIndex,
    status: exported.status,
    output_file: exported.outputFile,
    hash: exported.hash,
    message:
      exported.status === "archived_existing"
        ? "Existing human-readable markdown was archived and replaced."
        : exported.status === "backup_written"
          ? "Duplicate human-readable markdown was saved as a backup copy."
          : exported.status === "duplicate_skipped"
            ? "Duplicate human-readable markdown was detected and skipped."
            : "Human-readable markdown was organized and archived for review."
  };

  await appendJsonl(path.join(outputRoot, "notifications", "archive-events.jsonl"), [notification]);
  await writeTextFile(
    path.join(outputRoot, "notifications", "latest-archive-event.json"),
    JSON.stringify(notification, null, 2)
  );

  return notification;
}
