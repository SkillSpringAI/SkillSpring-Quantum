import assert from "node:assert";
import type { Conversation } from "../../core/parser/types.js";
import { segmentConversation } from "../../core/pipeline/segmenter.js";

const conversation: Conversation = {
  id: "summary-label-001",
  source: "chatgpt",
  title: "Untitled",
  createdAt: "2026-01-06T00:00:00.000Z",
  participants: ["user", "assistant"],
  messages: [
    {
      role: "user",
      text: "how do i check my laptop specs on windows and find ram cpu information",
      timestamp: "2026-01-06T00:00:01.000Z"
    },
    {
      role: "assistant",
      text: "open settings then go to system about to see processor ram and device specs",
      timestamp: "2026-01-06T00:00:02.000Z"
    }
  ]
};

const segments = segmentConversation(conversation, 4);

assert.equal(segments.length, 1, "Expected a single simple segment");
assert.ok(segments[0].summaryLabel, "Expected a readable summary label");
assert.ok(
  segments[0].summaryLabel?.includes("Laptop") || segments[0].summaryLabel?.includes("Windows"),
  "Expected summary label to use a readable topic phrase"
);
assert.notEqual(segments[0].summaryLabel, "Discussion", "Expected summary label to be more specific than a generic fallback");

console.log("segment-summary-label.test.ts passed");
