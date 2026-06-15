import assert from "node:assert";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { writeArchiveNotification } from "../../core/pipeline/archiveNotifier.js";
import type { ExportResult } from "../../core/pipeline/exporter.js";
import type { ConversationSegment } from "../../core/pipeline/segmenter.js";

const outputRoot = await mkdtemp(path.join(os.tmpdir(), "skillspring-archive-test-"));

try {
  const segment: ConversationSegment = {
    conversationId: "archive-test-001",
    source: "chatgpt",
    title: "Archive Test",
    createdAt: "2025-01-01T00:00:00.000Z",
    participants: ["user", "assistant"],
    topic: "docker_ports",
    rawTopic: "docker ports",
    confidence: 0.8,
    reason: "test",
    matchedKeywords: ["docker"],
    startIndex: 0,
    endIndex: 1,
    messages: []
  };

  const exported: ExportResult = {
    outputDir: path.join(outputRoot, "2025-01_docker_ports"),
    outputFile: path.join(outputRoot, "2025-01_docker_ports", "segment.md"),
    status: "primary_written",
    hash: "abc123"
  };

  const notification = await writeArchiveNotification(outputRoot, segment, exported);
  const latestRaw = await readFile(path.join(outputRoot, "notifications", "latest-archive-event.json"), "utf-8");
  const eventsRaw = await readFile(path.join(outputRoot, "notifications", "archive-events.jsonl"), "utf-8");

  assert.equal(notification.topic, "docker_ports");
  assert.match(notification.message, /Human-readable markdown/);
  assert.match(latestRaw, /archive-test-001/);
  assert.match(eventsRaw, /archive-test-001/);

  console.log("archive-notifications.test.ts passed");
} finally {
  await rm(outputRoot, { recursive: true, force: true });
}
