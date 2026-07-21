import assert from "node:assert";
import { fileURLToPath } from "node:url";
import { runPipelinePreflight } from "../../core/diagnostics/preflight.js";

const fixturePath = fileURLToPath(new URL("../fixtures/sample-copilot-activity.csv", import.meta.url));
const bomFixturePath = fileURLToPath(new URL("../fixtures/sample-copilot-activity-bom.csv", import.meta.url));
const result = await runPipelinePreflight(fixturePath, "organized_output");
const bomResult = await runPipelinePreflight(bomFixturePath, "organized_output");

assert.equal(result.ok, true, "Expected Copilot CSV preflight to succeed");
assert.equal(result.errors.length, 0, "Expected no Copilot CSV preflight errors");
assert.equal(result.warnings.length, 0, "Expected no Copilot CSV extension warning");
assert.equal(bomResult.ok, true, "Expected BOM-prefixed Copilot CSV preflight to succeed");
assert.equal(bomResult.errors.length, 0, "Expected no BOM-prefixed Copilot CSV preflight errors");

console.log("preflight-copilot-csv.test.ts passed");
