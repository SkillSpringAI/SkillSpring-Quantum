import assert from "node:assert";
import fixture from "../fixtures/sample-chatgpt-conversation.json" with { type: "json" };
import { parseChatGPTExport } from "../../core/parser/index.js";
import { segmentConversation } from "../../core/pipeline/segmenter.js";

const parsed = parseChatGPTExport(fixture);
const convo = parsed.conversations[0];
const segments = segmentConversation(convo, 2);

assert.ok(segments.length >= 1, "Expected at least one segment");
assert.ok(segments[0].messages.length >= 2, "Expected segment to contain messages");
assert.ok(typeof segments[0].topic === "string", "Expected topic string");

console.log("segmenter.test.ts passed");
