import assert from "node:assert";
import { rankSegmentEntries } from "../../ui/app/src/services/segmentRetrievalRanking";
import type { SegmentRetrievalIndexEntry } from "../../ui/app/src/types/segmentRetrievalIndex";

const entries: SegmentRetrievalIndexEntry[] = [
  {
    runId: "run-1",
    conversationId: "conversation-1",
    source: "claude",
    title: "Passport appointment notes",
    topic: "passport appointments",
    rawTopic: "passport appointment documents",
    summaryLabel: "Passport Appointment Decision",
    intent: "decision",
    importance: "medium",
    createdAt: "2026-07-06T10:00:00.000Z",
    startIndex: 0,
    endIndex: 3,
    messageCount: 4,
    signalTier: "high_signal",
    signalScore: 78,
    redactionCount: 0,
    textPreview: "what should i pack for a same day passport appointment",
    text: "passport appointment conversation",
    artifactPaths: [],
    searchText: "claude passport appointment decision documents"
  },
  {
    runId: "run-2",
    conversationId: "conversation-2",
    source: "grok",
    title: "Sports digest",
    topic: "sports updates",
    rawTopic: "sports update recap",
    summaryLabel: "Sports Updates Review",
    intent: "review",
    importance: "low",
    createdAt: "2026-07-05T10:00:00.000Z",
    startIndex: 0,
    endIndex: 2,
    messageCount: 3,
    signalTier: "low_signal",
    signalScore: 28,
    redactionCount: 0,
    textPreview: "sports recap",
    text: "sports conversation",
    artifactPaths: [],
    searchText: "grok sports updates recap"
  }
];

const rankedPassport = rankSegmentEntries(entries, {
  text: "passport appointments",
  vendor: "claude",
  topic: "passport"
});

assert.equal(rankedPassport[0].entry.conversationId, "conversation-1", "Expected passport segment to rank first");
assert.ok(rankedPassport[0].reasons.includes("source match"), "Expected source match reason");
assert.ok(
  rankedPassport[0].reasons.some((reason) => reason.includes("summary clue") || reason.includes("summary clues")),
  "Expected segment ranking reasons to explain summary-based matches"
);

const rankedAdjacentWording = rankSegmentEntries(entries, {
  text: "passport appointment",
  vendor: "",
  topic: ""
});

assert.equal(
  rankedAdjacentWording[0].entry.conversationId,
  "conversation-1",
  "Expected adjacent wording like appointment/appointments to keep the strongest segment first"
);

console.log("segment-retrieval-ranking.test.ts passed");
