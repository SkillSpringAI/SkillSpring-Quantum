import assert from "node:assert";
import { assessWaste } from "../../core/pipeline/wasteClassifier.js";

const trivialSegment = {
  conversationId: "x",
  source: "chatgpt",
  title: "Trivial",
  createdAt: new Date().toISOString(),
  participants: ["user", "assistant"],
  topic: "general",
  rawTopic: "general",
  confidence: 0.2,
  reason: "test",
  matchedKeywords: [],
  startIndex: 0,
  endIndex: 0,
  messages: [
    { role: "user", text: "thanks" }
  ]
};

const result = assessWaste(trivialSegment);

assert.ok(result.isWaste === true, "Expected trivial segment to be classified as waste");

console.log("waste-classifier.test.ts passed");
