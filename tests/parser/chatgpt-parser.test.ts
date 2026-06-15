import assert from "node:assert";
import fixture from "../fixtures/sample-chatgpt-conversation.json" with { type: "json" };
import { parseChatGPTExport } from "../../core/parser/index.js";

const parsed = parseChatGPTExport(fixture);

assert.ok(parsed.conversations.length === 1, "Expected one conversation");
assert.ok(parsed.conversations[0].messages.length === 4, "Expected four messages");
assert.ok(parsed.conversations[0].title === "Docker networking help", "Expected title to match");

console.log("chatgpt-parser.test.ts passed");
