import assert from "node:assert";
import { fileURLToPath } from "node:url";
import { inspectImportSource } from "../../core/imports/sourceIntake.js";

const fixturePath = fileURLToPath(new URL("../fixtures/sample-copilot-activity.csv", import.meta.url));
const summary = await inspectImportSource(fixturePath);

assert.equal(summary.inputType, "file", "Expected Copilot fixture to inspect as a file");
assert.equal(summary.totalFiles, 1, "Expected one Copilot fixture file");
assert.equal(summary.supportedFiles, 1, "Expected Copilot fixture to be supported");
assert.equal(summary.countsByKind.conversation_json, 1, "Expected Copilot CSV to be classified as a conversation import");
assert.equal(summary.sampleFiles[0]?.supportTier, "mvp_first_class", "Expected Copilot CSV to be first-class tier");
assert.equal(
  summary.sampleFiles[0]?.displayLabel,
  "Microsoft Copilot activity export",
  "Expected Copilot CSV label to stay vendor-specific"
);
assert.equal(summary.vendorSummaries[0]?.vendor, "copilot", "Expected Copilot vendor summary");
assert.equal(summary.vendorSummaries[0]?.supportTier, "mvp_first_class", "Expected Copilot vendor summary to stay first-class tier");
assert.ok(
  summary.sampleFiles[0]?.reason.includes("Microsoft Copilot activity export"),
  "Expected Copilot CSV reason to mention Copilot activity export"
);

console.log("copilot-source-intake.test.ts passed");
