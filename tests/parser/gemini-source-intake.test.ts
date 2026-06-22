import assert from "node:assert";
import { fileURLToPath } from "node:url";
import { inspectImportSource } from "../../core/imports/sourceIntake.js";

const fixturePath = fileURLToPath(new URL("../fixtures/sample-gemini-conversation.json", import.meta.url));
const summary = await inspectImportSource(fixturePath);

assert.equal(summary.inputType, "file", "Expected Gemini fixture to inspect as a file");
assert.equal(summary.totalFiles, 1, "Expected one Gemini fixture file");
assert.equal(summary.supportedFiles, 1, "Expected Gemini fixture to be supported");
assert.equal(summary.countsByKind.conversation_json, 1, "Expected Gemini export to be classified as a conversation import");
assert.equal(summary.sampleFiles[0]?.supportTier, "mvp_first_class", "Expected Gemini export to be first-class tier");
assert.equal(summary.sampleFiles[0]?.displayLabel, "Gemini export", "Expected Gemini export label to stay vendor-specific");
assert.equal(summary.vendorSummaries[0]?.vendor, "gemini", "Expected Gemini vendor summary");
assert.equal(summary.vendorSummaries[0]?.supportTier, "mvp_first_class", "Expected Gemini vendor summary to stay first-class tier");

console.log("gemini-source-intake.test.ts passed");
