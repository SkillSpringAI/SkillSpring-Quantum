import assert from "node:assert";
import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";
import chatgptFixture from "../fixtures/sample-chatgpt-conversation.json" with { type: "json" };
import { runConversationPipeline } from "../../core/pipeline/pipeline.js";
import { sha256 } from "../../core/utils/hash.js";

const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "chatgpt-streaming-resume-"));

try {
  const outputRoot = path.join(tempRoot, "output");
  const exportFile = path.join(tempRoot, "conversations-000.json");
  const secondConversation = JSON.parse(JSON.stringify(chatgptFixture)) as Record<string, unknown>;
  secondConversation.id = "fixture-conversation-002";
  secondConversation.conversation_id = "fixture-conversation-002";
  secondConversation.title = "Second fixture conversation";

  await fs.writeFile(
    exportFile,
    JSON.stringify([chatgptFixture, secondConversation], null, 2),
    "utf-8"
  );

  const progressPath = path.join(
    outputRoot,
    "imports",
    "streaming-shard-progress",
    sha256(path.normalize(exportFile).toLowerCase()) + ".json"
  );
  await fs.mkdir(path.dirname(progressPath), { recursive: true });
  await fs.writeFile(
    progressPath,
    JSON.stringify({
      sourcePath: exportFile,
      updatedAt: new Date().toISOString(),
      completedConversationIds: [String((chatgptFixture as Record<string, unknown>).conversation_id ?? (chatgptFixture as Record<string, unknown>).id)]
    }, null, 2),
    "utf-8"
  );

  const diagnostics = await runConversationPipeline(exportFile, outputRoot);

  assert.equal(diagnostics.status, "success", "Expected resumed streaming shard run to succeed");
  assert.equal(diagnostics.conversations_found, 1, "Expected resumed streaming shard run to skip the checkpointed conversation");

  await assert.rejects(
    () => fs.access(progressPath),
    "Expected streaming shard progress file to be removed after successful completion"
  );

  const finalizedOutputRoot = path.join(tempRoot, "finalized-output");
  const finalizedProgressPath = path.join(
    finalizedOutputRoot,
    "imports",
    "streaming-shard-progress",
    sha256(path.normalize(exportFile).toLowerCase()) + ".json"
  );
  await fs.mkdir(path.dirname(finalizedProgressPath), { recursive: true });
  await fs.writeFile(
    finalizedProgressPath,
    JSON.stringify({
      sourcePath: exportFile,
      updatedAt: new Date().toISOString(),
      completedConversationIds: [
        String((chatgptFixture as Record<string, unknown>).conversation_id ?? (chatgptFixture as Record<string, unknown>).id),
        "fixture-conversation-002"
      ],
      aggregate: {
        vendorSources: ["chatgpt"],
        sampleTitles: ["Docker networking help", "Second fixture conversation"],
        topicHints: ["Docker networking"],
        messageCount: 8,
        attachmentCount: 0
      },
      datasetSummary: {
        run_id: "interrupted-run",
        dataset_version: "v1",
        source_context: {
          pipeline_run_id: "interrupted-run",
          vendor_sources: ["chatgpt"],
          topic_hints: ["Docker networking"]
        },
        redaction_summary: {
          affected_segments: 0,
          total_redactions: 0,
          redaction_types: {}
        },
        topic_segments: 4,
        prompt_response_pairs: 4,
        micro_segments: 8,
        private_review_segments: 0,
        filtered_out_segments: 0,
        topics: { "Docker networking": 4 },
        tiers: { high_signal: 4, low_signal: 0, private_review: 0 },
        db_write_stats: {
          processed_topic_written: 4,
          processed_topic_skipped: 0,
          processed_pairs_written: 4,
          processed_pairs_skipped: 0,
          processed_micro_written: 8,
          processed_micro_skipped: 0,
          curated_topic_written: 4,
          curated_topic_skipped: 0,
          private_review_written: 0,
          private_review_skipped: 0
        }
      }
    }, null, 2),
    "utf-8"
  );

  const finalizedDiagnostics = await runConversationPipeline(exportFile, finalizedOutputRoot);
  assert.equal(finalizedDiagnostics.status, "success", "Expected a fully checkpointed shard to finalize successfully");
  assert.equal(
    finalizedDiagnostics.warnings.some((warning) => warning.code === "NO_CONVERSATIONS_FOUND"),
    false,
    "Expected a fully checkpointed shard not to be mistaken for an empty export"
  );
  const finalizedManifestPath = path.join(
    finalizedOutputRoot,
    "datasets",
    "manifests",
    finalizedDiagnostics.run_id + ".json"
  );
  const finalizedManifest = JSON.parse(await fs.readFile(finalizedManifestPath, "utf-8")) as {
    run_id: string;
    source_context: { conversation_count?: number; message_count?: number };
    topic_segments: number;
  };
  assert.equal(finalizedManifest.run_id, finalizedDiagnostics.run_id, "Expected resumed finalization to own the completed run id");
  assert.equal(finalizedManifest.source_context.conversation_count, 2, "Expected finalized manifest to retain checkpointed conversation count");
  assert.equal(finalizedManifest.source_context.message_count, 8, "Expected finalized manifest to retain checkpointed aggregate metadata");
  assert.equal(finalizedManifest.topic_segments, 4, "Expected finalized manifest to retain checkpointed dataset totals");
  await assert.rejects(
    () => fs.access(finalizedProgressPath),
    "Expected finalized checkpoint state to be cleared only after summary finalization"
  );
} finally {
  await fs.rm(tempRoot, { recursive: true, force: true });
}

console.log("chatgpt-streaming-shard-resume.test.ts passed");
