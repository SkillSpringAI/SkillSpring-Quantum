import assert from "node:assert";
import chatgptFixture from "../fixtures/sample-chatgpt-conversation.json" with { type: "json" };
import genericFixture from "../fixtures/sample-generic-conversation.json" with { type: "json" };
import grokFixture from "../fixtures/sample-grok-export.json" with { type: "json" };
import { detectAndParseConversationExport } from "../../core/parser/index.js";

const detectedChatgpt = detectAndParseConversationExport(chatgptFixture);
assert.equal(detectedChatgpt.kind, "chatgpt_export", "Expected ChatGPT fixture to detect as chatgpt_export");
assert.equal(detectedChatgpt.parsed.conversations.length, 1, "Expected parsed ChatGPT conversation");
assert.ok(detectedChatgpt.diagnostics.topLevelKeys.includes("mapping"), "Expected mapping key in diagnostics");

const detectedGeneric = detectAndParseConversationExport(genericFixture);
assert.equal(detectedGeneric.kind, "generic_conversation", "Expected generic fixture to detect as generic_conversation");
assert.equal(detectedGeneric.parsed.conversations.length, 1, "Expected parsed generic conversation");
assert.ok(detectedGeneric.diagnostics.candidateContainers.length > 0, "Expected candidate container diagnostics");

const detectedGrok = detectAndParseConversationExport(grokFixture);
assert.equal(detectedGrok.kind, "grok_export", "Expected Grok fixture to detect as grok_export");
assert.equal(detectedGrok.parsed.conversations.length, 1, "Expected parsed Grok conversation");
assert.equal(detectedGrok.parsed.conversations[0].source, "grok", "Expected Grok source");
assert.ok(detectedGrok.diagnostics.candidateContainers.includes("conversations"), "Expected Grok conversations container diagnostics");
assert.equal(detectedGrok.parsed.conversations[0].messages[0].attachments?.length, 1, "Expected Grok attachment refs to parse");

console.log("conversation-export-detection.test.ts passed");
