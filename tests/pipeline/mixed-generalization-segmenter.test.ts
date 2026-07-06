import assert from "node:assert";
import type { Conversation } from "../../core/parser/types.js";
import { segmentConversation } from "../../core/pipeline/segmenter.js";

const conversation: Conversation = {
  id: "mixed-generalization-001",
  source: "chatgpt",
  title: "Untitled",
  createdAt: "2026-07-06T12:00:00.000Z",
  participants: ["user", "assistant"],
  messages: [
    {
      role: "user",
      text: "how do i renew my passport and what documents do i need for the appointment",
      timestamp: "2026-07-06T12:00:00.000Z"
    },
    {
      role: "assistant",
      text: "you usually need your current passport, photos, and the renewal form for the appointment",
      timestamp: "2026-07-06T12:01:00.000Z"
    },
    {
      role: "user",
      text: "why does my cat litter box make the whole apartment smell and what should i change first",
      timestamp: "2026-07-06T12:05:00.000Z"
    },
    {
      role: "assistant",
      text: "start by scooping more often and checking the litter depth and ventilation",
      timestamp: "2026-07-06T12:06:00.000Z"
    },
    {
      role: "user",
      text: "how should i organize volunteer shifts for a school fundraiser across two weekends",
      timestamp: "2026-07-06T12:10:00.000Z"
    },
    {
      role: "assistant",
      text: "group people by availability and split setup, sales, and cleanup into separate shifts",
      timestamp: "2026-07-06T12:11:00.000Z"
    }
  ]
};

const segments = segmentConversation(conversation, 4);

assert.equal(segments.length, 3, "Expected mixed general-user topics to split into three segments");
assert.equal(segments[0].domainHint, "General", "Expected passport-help sample not to drift into a technical domain");
assert.ok(
  segments[0].summaryLabel?.includes("Renew Passport") || segments[0].summaryLabel?.includes("Passport"),
  "Expected passport-help segment to keep a readable user-facing label"
);
assert.ok(
  segments[1].summaryLabel?.includes("Cat Litter Box") || segments[1].summaryLabel?.includes("Apartment Smell"),
  "Expected household-care segment to keep a readable non-technical label"
);
assert.equal(segments[2].intent, "planning", "Expected volunteer scheduling segment to classify as planning");
assert.ok(
  segments[2].summaryLabel?.includes("Volunteer Shifts") || segments[2].summaryLabel?.includes("School Fundraiser"),
  "Expected volunteer planning segment to retain the user's real subject"
);

console.log("mixed-generalization-segmenter.test.ts passed");
