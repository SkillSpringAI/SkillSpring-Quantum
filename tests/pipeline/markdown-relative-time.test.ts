import assert from "node:assert";
import { renderSegmentMarkdown } from "../../core/utils/markdown.js";
import type { ConversationSegment } from "../../core/pipeline/segmenter.js";

const segment: ConversationSegment = {
  conversationId: "relative-time-001",
  source: "chatgpt",
  title: "Relative timestamps",
  createdAt: "2025-01-01T00:00:00.000Z",
  participants: ["user", "assistant"],
  topic: "docker_ports",
  rawTopic: "docker ports",
  confidence: 0.8,
  reason: "test",
  matchedKeywords: ["docker", "ports"],
  startIndex: 0,
  endIndex: 1,
  messages: [
    {
      role: "user",
      text: "How do I expose a Docker port?",
      timestamp: "2025-01-01T00:00:05.000Z"
    },
    {
      role: "assistant",
      text: "Use -p host:container.",
      timestamp: "2025-01-01T00:01:10.000Z"
    }
  ]
};

const markdown = renderSegmentMarkdown(segment);

assert.match(markdown, /\+5s \/ 2025-01-01T00:00:05.000Z/);
assert.match(markdown, /\+1m 10s \/ 2025-01-01T00:01:10.000Z/);

console.log("markdown-relative-time.test.ts passed");
