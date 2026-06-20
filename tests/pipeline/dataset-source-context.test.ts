import assert from "node:assert";
import os from "node:os";
import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { readJsonFile } from "../../core/utils/fs.js";
import { exportDatasets } from "../../core/pipeline/datasetExporter.js";
import type { ConversationSegment } from "../../core/pipeline/segmenter.js";

const tempRoot = await mkdtemp(path.join(os.tmpdir(), "skillspring-dataset-source-context-"));

try {
  const segments: ConversationSegment[] = [
    {
      conversationId: "conversation-1",
      source: "claude",
      title: "Claude Export Sample",
      createdAt: "2026-06-20T10:00:00.000Z",
      participants: ["user", "assistant"],
      topic: "crypto markets",
      rawTopic: "crypto markets",
      confidence: 0.8,
      reason: "test fixture",
      matchedKeywords: ["crypto", "markets"],
      startIndex: 0,
      endIndex: 1,
      messages: [
        {
          role: "user",
          text: "What changed in crypto markets today? Email me at analyst@example.com.",
          timestamp: "2026-06-20T10:00:00.000Z"
        },
        {
          role: "assistant",
          text: "Several assets moved on macro news.",
          timestamp: "2026-06-20T10:01:00.000Z"
        }
      ]
    }
  ];

  const summary = await exportDatasets(segments, tempRoot, "test-v1", {
    pipeline_run_id: "pipeline-run-123",
    source_input_path: "C:\\Exports\\claude\\conversations.json",
    detected_kind: "claude_export",
    detected_label: "Claude export",
    support_tier: "mvp_compatibility_fallback",
    vendor_sources: ["claude"],
    conversation_count: 1,
    message_count: 2,
    attachment_count: 0,
    package_companion_files: 1,
    package_companion_examples: ["users.json"],
    topic_hints: ["crypto markets"]
  });

  assert.equal(summary.source_context.pipeline_run_id, "pipeline-run-123");
  assert.equal(summary.source_context.source_input_path, "C:\\Exports\\claude\\conversations.json");
  assert.equal(summary.source_context.detected_label, "Claude export");
  assert.equal(summary.source_context.support_tier, "mvp_compatibility_fallback");
  assert.deepEqual(summary.source_context.vendor_sources, ["claude"]);
  assert.equal(summary.source_context.package_companion_files, 1);
  assert.deepEqual(summary.source_context.package_companion_examples, ["users.json"]);
  assert.deepEqual(summary.source_context.topic_hints, ["crypto markets"]);
  assert.equal(summary.redaction_summary.affected_segments, 1);
  assert.equal(summary.redaction_summary.total_redactions, 1);
  assert.equal(summary.redaction_summary.redaction_types.email, 1);

  const latestManifest = await readJsonFile<{
    source_context?: {
      pipeline_run_id: string;
      detected_label?: string;
      vendor_sources: string[];
      package_companion_files?: number;
      package_companion_examples?: string[];
    };
    redaction_summary?: {
      affected_segments: number;
      total_redactions: number;
      redaction_types: Record<string, number>;
    };
  }>(path.join(tempRoot, "db", "manifests", "latest-dataset-run.json"));

  assert.equal(latestManifest.source_context?.pipeline_run_id, "pipeline-run-123");
  assert.equal(latestManifest.source_context?.detected_label, "Claude export");
  assert.deepEqual(latestManifest.source_context?.vendor_sources, ["claude"]);
  assert.equal(latestManifest.source_context?.package_companion_files, 1);
  assert.deepEqual(latestManifest.source_context?.package_companion_examples, ["users.json"]);
  assert.equal(latestManifest.redaction_summary?.affected_segments, 1);
  assert.equal(latestManifest.redaction_summary?.redaction_types.email, 1);

  console.log("dataset-source-context.test.ts passed");
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}
