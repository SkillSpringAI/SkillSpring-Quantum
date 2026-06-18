import assert from "node:assert";
import claudeFixture from "../fixtures/sample-claude-conversation.json" with { type: "json" };
import grokFixture from "../fixtures/sample-grok-export.json" with { type: "json" };
import { detectAndParseConversationExport } from "../../core/parser/index.js";
import {
  buildImportRunRetrievalSummary,
  summarizeDetectedConversationImport
} from "../../core/imports/importMetadata.js";

const claudeDetected = detectAndParseConversationExport(claudeFixture);
const claudeMetadata = summarizeDetectedConversationImport(claudeDetected);
assert.ok(claudeMetadata, "Expected Claude-shaped fixture to produce conversation metadata");
assert.equal(claudeMetadata?.sourceCategory, "conversation");
assert.equal(claudeMetadata?.detectedLabel, "Claude conversation JSON");
assert.deepEqual(claudeMetadata?.conversationIds, ["claude-conversation-1"]);
assert.deepEqual(claudeMetadata?.vendorSources, ["claude"]);
assert.equal(claudeMetadata?.conversationCount, 1);
assert.ok((claudeMetadata?.messageCount ?? 0) >= 2, "Expected Claude metadata to count messages");
assert.ok((claudeMetadata?.topicHints.length ?? 0) > 0, "Expected Claude metadata to infer topic hints");
assert.ok(claudeMetadata?.startedAt, "Expected Claude metadata to include a start timestamp");
assert.ok(claudeMetadata?.endedAt, "Expected Claude metadata to include an end timestamp");

const grokDetected = detectAndParseConversationExport(grokFixture);
const grokMetadata = summarizeDetectedConversationImport(grokDetected);
assert.ok(grokMetadata, "Expected Grok fixture to produce conversation metadata");
assert.equal(grokMetadata?.detectedLabel, "Grok export");
assert.deepEqual(grokMetadata?.vendorSources, ["grok"]);
assert.ok((grokMetadata?.attachmentCount ?? 0) > 0, "Expected Grok metadata to count attachment references");

const runSummary = buildImportRunRetrievalSummary([
  {
    path: "claude.json",
    kind: "conversation_json",
    status: "imported",
    message: "ok",
    metadata: claudeMetadata ?? undefined
  },
  {
    path: "grok.json",
    kind: "conversation_json",
    status: "imported",
    message: "ok",
    metadata: grokMetadata ?? undefined
  }
]);

assert.ok(runSummary, "Expected run summary across conversation imports");
assert.deepEqual(runSummary?.vendorSources, ["claude", "grok"]);
assert.equal(runSummary?.conversationFiles, 2);
assert.ok((runSummary?.conversationCount ?? 0) >= 2, "Expected aggregated conversation count");
assert.ok((runSummary?.messageCount ?? 0) >= (claudeMetadata?.messageCount ?? 0), "Expected aggregated message count");
assert.ok(runSummary?.startedAt, "Expected aggregated start timestamp");
assert.ok(runSummary?.endedAt, "Expected aggregated end timestamp");

console.log("import-metadata.test.ts passed");
