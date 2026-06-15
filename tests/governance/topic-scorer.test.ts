import assert from "node:assert";
import { scoreCanonicalTopics } from "../../core/pipeline/topicScorer.js";

const results = scoreCanonicalTopics("docker nginx reverse proxy container port");

assert.ok(results.length > 0, "Expected at least one scored topic");
assert.ok(results[0].topic === "docker_networking", "Expected docker_networking to rank first");
assert.ok(results[0].score >= 2, "Expected useful score");

console.log("topic-scorer.test.ts passed");
