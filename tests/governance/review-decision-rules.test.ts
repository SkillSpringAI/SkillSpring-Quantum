import assert from "node:assert";
import { loadReviewDecisionRules } from "../../core/governance/loadRules.js";

const rules = loadReviewDecisionRules();

assert.ok(typeof rules.allow_approve === "boolean", "Expected allow_approve boolean");
assert.ok(typeof rules.allow_reject === "boolean", "Expected allow_reject boolean");
assert.ok(typeof rules.require_reason === "boolean", "Expected require_reason boolean");

console.log("review-decision-rules.test.ts passed");
