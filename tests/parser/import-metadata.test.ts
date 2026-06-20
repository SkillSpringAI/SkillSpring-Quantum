import assert from "node:assert";
import { readFile } from "node:fs/promises";
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
assert.equal(claudeMetadata?.detectedLabel, "Claude export");
assert.equal(claudeMetadata?.supportTier, "mvp_compatibility_fallback");
assert.deepEqual(claudeMetadata?.conversationIds, ["claude-conversation-1"]);
assert.deepEqual(claudeMetadata?.vendorSources, ["claude"]);
assert.equal(claudeMetadata?.conversationCount, 1);
assert.ok((claudeMetadata?.messageCount ?? 0) >= 2, "Expected Claude metadata to count messages");
assert.equal(claudeMetadata?.attachmentCount, 2, "Expected Claude metadata to count attachment references");
assert.ok((claudeMetadata?.topicHints.length ?? 0) > 0, "Expected Claude metadata to infer topic hints");
assert.ok(claudeMetadata?.startedAt, "Expected Claude metadata to include a start timestamp");
assert.ok(claudeMetadata?.endedAt, "Expected Claude metadata to include an end timestamp");

const grokDetected = detectAndParseConversationExport(grokFixture);
const grokMetadata = summarizeDetectedConversationImport(grokDetected);
assert.ok(grokMetadata, "Expected Grok fixture to produce conversation metadata");
assert.equal(grokMetadata?.detectedLabel, "Grok export");
assert.equal(grokMetadata?.supportTier, "mvp_first_class");
assert.deepEqual(grokMetadata?.vendorSources, ["grok"]);
assert.ok((grokMetadata?.attachmentCount ?? 0) > 0, "Expected Grok metadata to count attachment references");

const geminiHtmlFixture = await readFile(new URL("../fixtures/sample-gemini-activity.html", import.meta.url), "utf-8");
const geminiHtmlDetected = detectAndParseConversationExport(geminiHtmlFixture);
const geminiHtmlMetadata = summarizeDetectedConversationImport(geminiHtmlDetected);
assert.ok(geminiHtmlMetadata, "Expected Gemini HTML fixture to produce conversation metadata");
assert.equal(geminiHtmlMetadata?.detectedLabel, "Gemini My Activity export");
assert.equal(geminiHtmlMetadata?.supportTier, "mvp_compatibility_fallback");
assert.deepEqual(geminiHtmlMetadata?.vendorSources, ["gemini"]);

const copilotCsvFixture = await readFile(new URL("../fixtures/sample-copilot-activity.csv", import.meta.url), "utf-8");
const copilotCsvDetected = detectAndParseConversationExport(copilotCsvFixture);
const copilotCsvMetadata = summarizeDetectedConversationImport(copilotCsvDetected);
assert.ok(copilotCsvMetadata, "Expected Copilot CSV fixture to produce conversation metadata");
assert.equal(copilotCsvMetadata?.detectedLabel, "Microsoft Copilot activity export");
assert.equal(copilotCsvMetadata?.supportTier, "mvp_compatibility_fallback");
assert.deepEqual(copilotCsvMetadata?.vendorSources, ["copilot"]);
assert.equal(copilotCsvMetadata?.conversationCount, 2);

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
assert.deepEqual(runSummary?.supportTiers, ["mvp_first_class", "mvp_compatibility_fallback"]);
assert.deepEqual(runSummary?.vendorSources, ["claude", "grok"]);
assert.equal(runSummary?.conversationFiles, 2);
assert.ok((runSummary?.conversationCount ?? 0) >= 2, "Expected aggregated conversation count");
assert.ok((runSummary?.messageCount ?? 0) >= (claudeMetadata?.messageCount ?? 0), "Expected aggregated message count");
assert.ok(runSummary?.startedAt, "Expected aggregated start timestamp");
assert.ok(runSummary?.endedAt, "Expected aggregated end timestamp");

console.log("import-metadata.test.ts passed");
