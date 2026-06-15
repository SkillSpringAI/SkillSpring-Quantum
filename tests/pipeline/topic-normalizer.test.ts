import assert from "node:assert";
import { normalizeTopic } from "../../core/pipeline/topicNormalizer.js";

const result = normalizeTopic("docker nginx reverse proxy container port");

assert.ok(result.normalizedTopic === "docker_networking", "Expected canonical docker topic");
assert.ok(result.reason === "canonical_keyword_score" || result.reason === "alias_memory", "Expected scored or alias-based reason");
assert.ok(result.confidence >= 0.45, "Expected useful confidence");

console.log("topic-normalizer.test.ts passed");
