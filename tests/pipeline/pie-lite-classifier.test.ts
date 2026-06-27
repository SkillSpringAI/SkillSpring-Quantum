import assert from "node:assert";
import { classifyMessages } from "../../core/models/classifier.js";
import { segmentConversation } from "../../core/pipeline/segmenter.js";
import type { Conversation } from "../../core/parser/types.js";

const troubleshooting = classifyMessages("Docker help", [
  {
    role: "user",
    text: "Docker port mapping keeps failing with a 500 style proxy error and I need this fixed ASAP.",
    timestamp: "2026-06-27T10:00:00.000Z"
  },
  {
    role: "assistant",
    text: "Check the port binding and nginx upstream settings.",
    timestamp: "2026-06-27T10:01:00.000Z"
  }
]);

assert.ok(troubleshooting, "Expected troubleshooting sample to classify");
assert.equal(troubleshooting?.intent, "troubleshooting");
assert.equal(troubleshooting?.importance, "high");
assert.ok(
  troubleshooting?.summaryLabel.includes("Docker") && troubleshooting?.summaryLabel.includes("Troubleshooting"),
  "Expected troubleshooting label to be human-readable"
);

const planning = classifyMessages("Roadmap sync", [
  {
    role: "user",
    text: "Help me plan the MVP roadmap and prioritize the next product milestones.",
    timestamp: "2026-06-27T11:00:00.000Z"
  }
]);

assert.ok(planning, "Expected planning sample to classify");
assert.equal(planning?.intent, "planning");
assert.ok(planning?.summaryLabel.includes("Roadmap") || planning?.summaryLabel.includes("Product"));

const conversation: Conversation = {
  id: "pie-lite-segment-001",
  source: "chatgpt",
  title: "Docker help",
  createdAt: "2026-06-27T10:00:00.000Z",
  participants: ["user", "assistant"],
  messages: [
    {
      role: "user",
      text: "Docker port mapping localhost container expose bind port failed and is blocking me.",
      timestamp: "2026-06-27T10:00:00.000Z"
    },
    {
      role: "assistant",
      text: "Use publish flags and check container networking.",
      timestamp: "2026-06-27T10:01:00.000Z"
    }
  ]
};

const segments = segmentConversation(conversation, 2);
assert.equal(segments.length, 1, "Expected a single segment for the simple fixture");
assert.equal(segments[0].intent, "troubleshooting");
assert.ok(segments[0].summaryLabel?.includes("Docker"), "Expected segment summary label to be readable");

console.log("pie-lite-classifier.test.ts passed");
