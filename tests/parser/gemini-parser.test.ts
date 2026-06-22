import assert from "node:assert";
import geminiFixture from "../fixtures/sample-gemini-conversation.json" with { type: "json" };
import { isGeminiExportShape, parseGeminiExport } from "../../core/parser/index.js";

assert.equal(isGeminiExportShape(geminiFixture), true, "Expected Gemini fixture to match named Gemini export shape");

const parsed = parseGeminiExport(geminiFixture);
assert.equal(parsed.conversations.length, 1, "Expected Gemini parser to return one conversation");
assert.equal(parsed.conversations[0].source, "gemini", "Expected Gemini parser to preserve Gemini source");
assert.equal(parsed.conversations[0].title, "Gemini Export Sample", "Expected Gemini parser to preserve title");
assert.equal(parsed.conversations[0].messages.length, 2, "Expected Gemini parser to preserve messages");

console.log("gemini-parser.test.ts passed");
