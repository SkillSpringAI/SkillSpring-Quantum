import assert from "node:assert";
import type { Conversation } from "../../core/parser/types.js";
import { segmentConversation } from "../../core/pipeline/segmenter.js";

const conversation: Conversation = {
  id: "corpus-agnostic-segmenter-001",
  source: "chatgpt",
  title: "Untitled",
  createdAt: "2026-07-05T08:00:00.000Z",
  participants: ["user", "assistant"],
  messages: [
    {
      role: "user",
      text: "Can you help me understand my travel reimbursement policy for hotel receipts and meal limits?",
      timestamp: "2026-07-05T08:00:00.000Z"
    },
    {
      role: "assistant",
      text: "Yes. Start by checking which hotel receipts are reimbursable and what the meal limit caps are.",
      timestamp: "2026-07-05T08:01:00.000Z"
    },
    {
      role: "user",
      text: "Why are my tomato leaves turning yellow after heavy rain and what should I change first?",
      timestamp: "2026-07-05T08:05:00.000Z"
    },
    {
      role: "assistant",
      text: "Heavy rain can stress the roots, so check drainage and ease back on watering first.",
      timestamp: "2026-07-05T08:06:00.000Z"
    },
    {
      role: "user",
      text: "How do I check my laptop specs on Windows and find RAM and CPU information?",
      timestamp: "2026-07-05T08:10:00.000Z"
    },
    {
      role: "assistant",
      text: "Open Settings, go to System, then About to see your processor, RAM, and device specs.",
      timestamp: "2026-07-05T08:11:00.000Z"
    }
  ]
};

const segments = segmentConversation(conversation, 4);

assert.equal(segments.length, 3, "Expected mixed-domain conversation to split into three topic segments");
assert.ok(
  segments[0].summaryLabel?.includes("Travel Reimbursement") ||
    segments[0].summaryLabel?.includes("Hotel Receipts") ||
    segments[0].summaryLabel?.includes("Meal Limits"),
  "Expected admin-style topic to retain readable user phrasing"
);
assert.ok(
  segments[1].summaryLabel?.includes("Tomato Leaves") || segments[1].summaryLabel?.includes("Heavy Rain"),
  "Expected hobby-style topic to retain readable user phrasing"
);
assert.ok(
  segments[2].summaryLabel?.includes("Laptop") || segments[2].summaryLabel?.includes("Windows"),
  "Expected device-help topic to retain readable user phrasing"
);

console.log("corpus-agnostic-segmenter.test.ts passed");
