import assert from "node:assert";
import fixture from "../fixtures/sample-chatgpt-conversation.json" with { type: "json" };
import { parseChatGPTExport } from "../../core/parser/index.js";
import { looksLikeChatGptConversationArrayText } from "../../core/parser/chatgpt.js";

const parsed = parseChatGPTExport(fixture);
const parsedFromJsonText = parseChatGPTExport(JSON.stringify([fixture]));

assert.ok(parsed.conversations.length === 1, "Expected one conversation");
assert.ok(parsed.conversations[0].messages.length === 4, "Expected four messages");
assert.ok(parsed.conversations[0].title === "Docker networking help", "Expected title to match");
assert.ok(looksLikeChatGptConversationArrayText(JSON.stringify([fixture])), "Expected ChatGPT JSON text heuristic to recognize conversation arrays");
assert.ok(parsedFromJsonText.conversations.length === 1, "Expected ChatGPT JSON text to parse without eager top-level JSON parsing");
assert.ok(parsedFromJsonText.conversations[0].messages.length === 4, "Expected ChatGPT JSON text path to preserve messages");

console.log("chatgpt-parser.test.ts passed");
