import assert from "node:assert";
import { formatNormalizedTopicLabel, normalizeTopic } from "../../core/pipeline/topicNormalizer.js";

const result = normalizeTopic("docker nginx reverse proxy container port");

assert.ok(result.normalizedTopic === "docker_networking", "Expected canonical docker topic");
assert.ok(result.reason === "canonical_keyword_score" || result.reason === "alias_memory", "Expected scored or alias-based reason");
assert.ok(result.confidence >= 0.45, "Expected useful confidence");
assert.equal(formatNormalizedTopicLabel(result.normalizedTopic), "Docker Networking", "Expected canonical topic to be humanized for display");

console.log("topic-normalizer.test.ts passed");
