import assert from "node:assert";
import { classifyMessages } from "../../core/models/classifier.js";

const personalAdmin = classifyMessages("Untitled", [
  {
    role: "user",
    text: "Can you help me understand my travel reimbursement policy for hotel receipts and meal limits?",
    timestamp: "2026-07-02T09:00:00.000Z"
  }
]);

assert.ok(personalAdmin, "Expected personal admin sample to classify");
assert.notEqual(personalAdmin?.summaryLabel, "Discussion", "Expected something more specific than a generic fallback");
assert.ok(
  personalAdmin?.summaryLabel.includes("Travel Reimbursement") ||
    personalAdmin?.summaryLabel.includes("Hotel Receipts") ||
    personalAdmin?.summaryLabel.includes("Meal Limits"),
  "Expected summary label to reflect the user's own phrasing"
);

const homeCare = classifyMessages("Untitled", [
  {
    role: "user",
    text: "Why are my tomato leaves turning yellow after heavy rain and what should I change first?",
    timestamp: "2026-07-02T09:05:00.000Z"
  }
]);

assert.ok(homeCare, "Expected home care sample to classify");
assert.notEqual(homeCare?.summaryLabel, "Discussion", "Expected a readable label for non-technical content");
assert.ok(
  homeCare?.summaryLabel.includes("Tomato Leaves") || homeCare?.summaryLabel.includes("Heavy Rain"),
  "Expected summary label to generalize beyond technical domains"
);

console.log("classifier-generalization.test.ts passed");
