import assert from "node:assert";
import { shouldIncludeTopic } from "../../core/pipeline/topicFilter.js";

const result = shouldIncludeTopic("docker_networking");

assert.ok(typeof result.allowed === "boolean", "Expected boolean filter decision");
assert.ok(typeof result.reason === "string", "Expected filter reason");

console.log("topic-filter.test.ts passed");
