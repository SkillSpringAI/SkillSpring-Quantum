import assert from "node:assert";
import path from "node:path";
import {
  governanceRulesRoot,
  ensureInsideGovernanceRules
} from "../../core/governance/fsRules.js";

const root = governanceRulesRoot();
const safe = path.join(root, "signal-thresholds.json");
const resolvedSafe = ensureInsideGovernanceRules(safe);

assert.ok(resolvedSafe.endsWith("signal-thresholds.json"), "Expected safe path resolution");

let blocked = false;
try {
  ensureInsideGovernanceRules(path.resolve("package.json"));
} catch {
  blocked = true;
}

assert.ok(blocked, "Expected path traversal/blocking outside governance rules");

console.log("governance-fs.test.ts passed");
