import assert from "node:assert";
import { topicSegmentIdentityKey } from "../../core/db/topicSegmentIdentity.js";

const first = {
  conversation_id: "alpha|beta",
  topic: "gamma",
  start_index: 1,
  end_index: 2,
  text: "same text"
};

const second = {
  conversation_id: "alpha",
  topic: "beta|gamma",
  start_index: 1,
  end_index: 2,
  text: "same text"
};

const third = {
  conversation_id: "alpha|beta",
  topic: "gamma",
  start_index: 1,
  end_index: 2,
  text: "different text"
};

assert.notEqual(
  topicSegmentIdentityKey(first),
  topicSegmentIdentityKey(second),
  "Expected structured topic-segment identity to avoid delimiter collisions across fields"
);

assert.notEqual(
  topicSegmentIdentityKey(first),
  topicSegmentIdentityKey(third),
  "Expected topic-segment identity to keep distinct text variants separate for queue and promotion decisions"
);

assert.equal(
  topicSegmentIdentityKey(first),
  topicSegmentIdentityKey({ ...first }),
  "Expected identical records to produce identical topic-segment identity keys"
);

console.log("topic-segment-identity.test.ts passed");
