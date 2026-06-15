import assert from "node:assert";
import { loadCurationRules } from "../../core/governance/loadRules.js";

const rules = loadCurationRules();

assert.ok(Array.isArray(rules.allowed_signal_tiers), "Expected allowed_signal_tiers array");
assert.ok(typeof rules.minimum_signal_score === "number", "Expected numeric minimum_signal_score");
assert.ok(typeof rules.collections.topic_segments === "boolean", "Expected collection toggle");

console.log("curation-rules.test.ts passed");
