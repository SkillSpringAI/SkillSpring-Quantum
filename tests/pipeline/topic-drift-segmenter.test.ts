import assert from "node:assert";
import type { Conversation } from "../../core/parser/types.js";
import { segmentConversation } from "../../core/pipeline/segmenter.js";

const conversation: Conversation = {
  id: "topic-drift-001",
  source: "chatgpt",
  title: "Docker help",
  createdAt: "2025-01-01T00:00:00.000Z",
  participants: ["user", "assistant"],
  messages: [
    {
      role: "user",
      text: "Docker port mapping localhost container expose bind port",
      timestamp: "2025-01-01T00:00:01.000Z"
    },
    {
      role: "assistant",
      text: "Use docker run publish host port to container port",
      timestamp: "2025-01-01T00:00:02.000Z"
    },
    {
      role: "user",
      text: "Recipe sourdough bread starter flour hydration bake loaf",
      timestamp: "2025-01-01T00:05:00.000Z"
    },
    {
      role: "assistant",
      text: "Feed the starter and bake when the dough has risen",
      timestamp: "2025-01-01T00:05:01.000Z"
    },
    {
      role: "user",
      text: "Docker nginx reverse proxy upstream container network fails",
      timestamp: "2025-01-01T00:10:00.000Z"
    },
    {
      role: "assistant",
      text: "Check nginx upstream host and docker network aliases",
      timestamp: "2025-01-01T00:10:01.000Z"
    }
  ]
};

const segments = segmentConversation(conversation, 2);

assert.equal(segments.length, 3, "Expected topic drift to split into three intent-based segments");
assert.equal(segments[0].startIndex, 0);
assert.equal(segments[0].endIndex, 1);
assert.equal(segments[1].startIndex, 2);
assert.equal(segments[1].endIndex, 3);
assert.equal(segments[2].startIndex, 4);
assert.equal(segments[2].endIndex, 5);

console.log("topic-drift-segmenter.test.ts passed");
