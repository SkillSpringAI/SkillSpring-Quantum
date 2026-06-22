import assert from "node:assert";
import { readFile } from "node:fs/promises";
import claudeFixture from "../fixtures/sample-claude-conversation.json" with { type: "json" };
import geminiFixture from "../fixtures/sample-gemini-conversation.json" with { type: "json" };
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

const detectedClaude = detectAndParseConversationExport(claudeFixture);
assert.equal(detectedClaude.kind, "claude_export", "Expected Claude fixture to detect as claude_export");
assert.equal(detectedClaude.label, "Claude export", "Expected Claude export label");
assert.equal(detectedClaude.parsed.conversations.length, 1, "Expected parsed Claude conversation");
assert.equal(detectedClaude.parsed.conversations[0].source, "claude", "Expected Claude source");
assert.equal(detectedClaude.parsed.conversations[0].messages[0].attachments?.length, 2, "Expected Claude attachment refs to parse");
assert.equal(detectedClaude.diagnostics.matchedPath, "[0].chat_messages", "Expected Claude diagnostics path");

const detectedGemini = detectAndParseConversationExport(geminiFixture);
assert.equal(detectedGemini.kind, "gemini_export", "Expected Gemini fixture to detect as gemini_export");
assert.equal(detectedGemini.label, "Gemini export", "Expected Gemini export label");
assert.equal(detectedGemini.parsed.conversations.length, 1, "Expected parsed Gemini conversation");
assert.equal(detectedGemini.parsed.conversations[0].source, "gemini", "Expected Gemini source");
assert.equal(detectedGemini.diagnostics.matchedPath, "messages", "Expected Gemini diagnostics path");

const copilotFixture = await readFile(new URL("../fixtures/sample-copilot-activity.csv", import.meta.url), "utf-8");
const detectedCopilot = detectAndParseConversationExport(copilotFixture);
assert.equal(detectedCopilot.kind, "copilot_activity_csv", "Expected Copilot fixture to detect as copilot_activity_csv");
assert.equal(detectedCopilot.parsed.conversations.length, 2, "Expected parsed Copilot conversations");
assert.equal(detectedCopilot.parsed.conversations[0].source, "copilot", "Expected Copilot source");
assert.equal(detectedCopilot.diagnostics.matchedPath, "csv.rows", "Expected Copilot CSV diagnostics path");

console.log("conversation-export-detection.test.ts passed");
