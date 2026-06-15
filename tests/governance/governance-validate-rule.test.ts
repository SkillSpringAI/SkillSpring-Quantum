import assert from "node:assert";
import { validateGovernanceRuleFile } from "../../core/governance/validateRuleFile.js";

const validTopicFilter = JSON.stringify({
  version: "topic-filter-rules.v1",
  include_topics: [],
  exclude_topics: [],
  exclude_general_by_default: false
});

validateGovernanceRuleFile("topic-filter-rules.json", validTopicFilter);
validateGovernanceRuleFile("topic-filter-rules.json", "\uFEFF" + validTopicFilter);

let blocked = false;
try {
  validateGovernanceRuleFile(
    "topic-filter-rules.json",
    JSON.stringify({
      version: "topic-filter-rules.v1",
      include_topics: [],
      exclude_general_by_default: false
    })
  );
} catch {
  blocked = true;
}

assert.ok(blocked, "Expected invalid topic-filter rules to be rejected");

const validReviewDecision = JSON.stringify({
  version: "review-decision-rules.v1",
  allow_approve: true,
  allow_reject: true,
  require_reason: true,
  collections: {
    "review_queue.topic_segments": true
  }
});

validateGovernanceRuleFile("review-decision-rules.json", validReviewDecision);

console.log("governance-validate-rule.test.ts passed");
