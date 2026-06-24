import assert from "node:assert";
import { fileURLToPath } from "node:url";
import { inspectImportSource } from "../../core/imports/sourceIntake.js";

const fixturePath = fileURLToPath(new URL("../fixtures/sample-chatgpt-conversation.json", import.meta.url));
const summary = await inspectImportSource(fixturePath);

assert.equal(summary.inputType, "file", "Expected ChatGPT fixture to inspect as a file");
assert.equal(summary.totalFiles, 1, "Expected one ChatGPT fixture file");
assert.equal(summary.supportedFiles, 1, "Expected ChatGPT fixture to be supported");
assert.equal(summary.countsByKind.chatgpt_export, 1, "Expected ChatGPT export to be classified directly");
assert.equal(summary.sampleFiles[0]?.supportTier, "mvp_first_class", "Expected ChatGPT export to be first-class tier");
assert.equal(summary.sampleFiles[0]?.displayLabel, "ChatGPT export", "Expected ChatGPT label to stay vendor-specific");
assert.equal(summary.vendorSummaries[0]?.vendor, "chatgpt", "Expected ChatGPT vendor summary");
assert.equal(summary.vendorSummaries[0]?.supportTier, "mvp_first_class", "Expected ChatGPT vendor summary to stay first-class tier");
assert.ok(
  summary.sampleFiles[0]?.reason.includes("ChatGPT export"),
  "Expected ChatGPT reason to mention ChatGPT export"
);

console.log("chatgpt-source-intake.test.ts passed");
