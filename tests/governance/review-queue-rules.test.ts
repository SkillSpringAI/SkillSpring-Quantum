import assert from "node:assert";
import { loadReviewQueueRules } from "../../core/governance/loadRules.js";

const rules = loadReviewQueueRules();

assert.ok(typeof rules.enabled === "boolean", "Expected enabled boolean");
assert.ok(Array.isArray(rules.allowed_signal_tiers), "Expected allowed_signal_tiers array");
assert.ok(typeof rules.minimum_signal_score === "number", "Expected numeric minimum_signal_score");
assert.ok(typeof rules.maximum_signal_score === "number", "Expected numeric maximum_signal_score");

console.log("review-queue-rules.test.ts passed");
