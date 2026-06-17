import assert from "node:assert";
import fixture from "../fixtures/sample-generic-conversation.json" with { type: "json" };
import nestedFixture from "../fixtures/sample-generic-conversation-nested.json" with { type: "json" };
import messageArrayFixture from "../fixtures/sample-generic-message-array.json" with { type: "json" };
import claudeFixture from "../fixtures/sample-claude-conversation.json" with { type: "json" };
import geminiFixture from "../fixtures/sample-gemini-conversation.json" with { type: "json" };
import { parseGenericConversationExport } from "../../core/parser/index.js";

const parsed = parseGenericConversationExport(fixture);

assert.equal(parsed.conversations.length, 1, "Expected one generic conversation");
assert.equal(parsed.conversations[0].source, "generic", "Expected generic source");
assert.equal(parsed.conversations[0].messages.length, 4, "Expected four messages");
assert.equal(parsed.conversations[0].messages[2].role, "user", "Expected human author to map to user");
assert.equal(parsed.conversations[0].messages[3].role, "assistant", "Expected Claude author to map to assistant");

const nestedParsed = parseGenericConversationExport(nestedFixture);
assert.equal(nestedParsed.conversations.length, 1, "Expected one nested conversation");
assert.equal(nestedParsed.conversations[0].title, "Vendor Nested Blocks", "Expected subject to map to title");
assert.equal(nestedParsed.conversations[0].messages.length, 2, "Expected two nested messages");
assert.equal(nestedParsed.conversations[0].messages[1].role, "assistant", "Expected vendor sender to map to assistant");
assert.ok(
  nestedParsed.conversations[0].messages[1].text.includes("Next work should focus on vendor export support."),
  "Expected nested block text to be flattened"
);

const messageArrayParsed = parseGenericConversationExport(messageArrayFixture);
assert.equal(messageArrayParsed.conversations.length, 1, "Expected direct message array to parse as one conversation");
assert.equal(messageArrayParsed.conversations[0].messages.length, 2, "Expected two direct messages");
assert.equal(messageArrayParsed.conversations[0].messages[0].role, "user", "Expected customer speaker to map to user");
assert.equal(messageArrayParsed.conversations[0].messages[1].role, "assistant", "Expected bot speaker to map to assistant");

const claudeParsed = parseGenericConversationExport(claudeFixture);
assert.equal(claudeParsed.conversations.length, 1, "Expected Claude export fixture to parse as one conversation");
assert.equal(claudeParsed.conversations[0].title, "Claude Export Sample", "Expected Claude name to map to title");
assert.equal(claudeParsed.conversations[0].messages[1].role, "assistant", "Expected Claude assistant sender to map to assistant");
assert.equal(
  claudeParsed.conversations[0].messages[1].text,
  "This is a meaty design doc - let me build a playable prototype of Era of Ruin.",
  "Expected Claude parser to prefer message text over verbose tool payload content"
);

const geminiParsed = parseGenericConversationExport(geminiFixture);
assert.equal(geminiParsed.conversations.length, 1, "Expected Gemini export fixture to parse as one conversation");
assert.equal(geminiParsed.conversations[0].title, "Gemini Export Sample", "Expected Gemini title to be preserved");
assert.equal(geminiParsed.conversations[0].messages.length, 2, "Expected Gemini messages to parse");
assert.equal(
  geminiParsed.conversations[0].messages[1].text,
  "Here is a structured governance framework with phased rollout guidance.",
  "Expected Gemini parser to read markdown content"
);

console.log("generic-conversation-parser.test.ts passed");
