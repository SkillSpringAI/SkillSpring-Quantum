import assert from "node:assert";
import claudeFixture from "../fixtures/sample-claude-conversation.json" with { type: "json" };
import { isClaudeExportShape, parseClaudeExport } from "../../core/parser/index.js";

assert.equal(isClaudeExportShape(claudeFixture), true, "Expected Claude fixture to match named Claude export shape");

const parsed = parseClaudeExport(claudeFixture);
assert.equal(parsed.conversations.length, 1, "Expected Claude parser to return one conversation");
assert.equal(parsed.conversations[0].source, "claude", "Expected Claude parser to preserve Claude source");
assert.equal(parsed.conversations[0].title, "Claude Export Sample", "Expected Claude parser to preserve title");
assert.equal(parsed.conversations[0].messages[0].attachments?.length, 2, "Expected Claude parser to preserve attachment references");

console.log("claude-parser.test.ts passed");
