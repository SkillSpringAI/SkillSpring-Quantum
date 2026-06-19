import assert from "node:assert";
import { fileURLToPath } from "node:url";
import { runPipelinePreflight } from "../../core/diagnostics/preflight.js";

const fixturePath = fileURLToPath(new URL("../fixtures/sample-copilot-activity.csv", import.meta.url));
const result = await runPipelinePreflight(fixturePath, "organized_output");

assert.equal(result.ok, true, "Expected Copilot CSV preflight to succeed");
assert.equal(result.errors.length, 0, "Expected no Copilot CSV preflight errors");
assert.equal(result.warnings.length, 0, "Expected no Copilot CSV extension warning");

console.log("preflight-copilot-csv.test.ts passed");
