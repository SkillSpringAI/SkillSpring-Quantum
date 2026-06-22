import assert from "node:assert";
import { fileURLToPath } from "node:url";
import { inspectImportSource } from "../../core/imports/sourceIntake.js";

const fixturePath = fileURLToPath(new URL("../fixtures/sample-claude-conversation.json", import.meta.url));
const summary = await inspectImportSource(fixturePath);

assert.equal(summary.inputType, "file", "Expected Claude fixture to inspect as a file");
assert.equal(summary.totalFiles, 1, "Expected one Claude fixture file");
assert.equal(summary.supportedFiles, 1, "Expected Claude fixture to be supported");
assert.equal(summary.countsByKind.conversation_json, 1, "Expected Claude export to be classified as a conversation import");
assert.equal(summary.sampleFiles[0]?.supportTier, "mvp_first_class", "Expected Claude export to be first-class tier");
assert.equal(summary.sampleFiles[0]?.displayLabel, "Claude export", "Expected Claude export label to stay vendor-specific");
assert.equal(summary.vendorSummaries[0]?.vendor, "claude", "Expected Claude vendor summary");
assert.equal(summary.vendorSummaries[0]?.supportTier, "mvp_first_class", "Expected Claude vendor summary to stay first-class tier");
assert.ok(
  summary.sampleFiles[0]?.reason.includes("Claude export"),
  "Expected Claude export reason to mention Claude export"
);

console.log("claude-source-intake.test.ts passed");
