import assert from "node:assert";
import { rankRetrievalEntries } from "../../ui/app/src/services/retrievalRanking";
import type { ImportRetrievalIndexEntry } from "../../ui/app/src/types/importRetrievalIndex";

const entries: ImportRetrievalIndexEntry[] = [
  {
    runAt: "2026-06-18T10:00:00.000Z",
    inputPath: "C:\\Exports\\claude",
    filePath: "C:\\Exports\\claude\\crypto.json",
    kind: "conversation_json",
    status: "imported",
    message: "Conversation import processed.",
    sourceCategory: "conversation",
    conversationIds: ["claude-conversation-1"],
    vendorSources: ["claude"],
    titleHints: ["Crypto market updates"],
    topicHints: ["crypto markets", "portfolio review"],
    searchText: "c:\\exports\\claude\\crypto.json crypto market updates crypto markets portfolio review conversation import processed claude",
    startedAt: "2026-05-10T10:00:00.000Z",
    endedAt: "2026-05-11T10:00:00.000Z",
    conversationCount: 2,
    messageCount: 8,
    attachmentCount: 0,
    artifactLabels: ["Latest archived markdown", "Current topic segments dataset"],
    artifactPaths: [],
    evidenceSources: ["import metadata", "archive output", "dataset output"],
    evidenceDetails: [
      {
        kind: "import_metadata",
        label: "Import metadata",
        detail: "Vendor: claude | Title clues: Crypto market updates | Topic hints: crypto markets, portfolio review"
      }
    ],
    nextAction: "open_archive",
    nextActionLabel: "Open Readable Archive next"
  },
  {
    runAt: "2026-06-17T10:00:00.000Z",
    inputPath: "C:\\Exports\\grok",
    filePath: "C:\\Exports\\grok\\sports.json",
    kind: "conversation_json",
    status: "imported",
    sourceCategory: "conversation",
    message: "Conversation import processed.",
    conversationIds: ["grok-conversation-1"],
    vendorSources: ["grok"],
    titleHints: ["Sports digest"],
    topicHints: ["sports updates"],
    searchText: "c:\\exports\\grok\\sports.json sports digest sports updates conversation import processed grok",
    startedAt: "2026-05-12T10:00:00.000Z",
    endedAt: "2026-05-12T11:00:00.000Z",
    conversationCount: 1,
    messageCount: 4,
    attachmentCount: 1,
    artifactLabels: ["Current topic segments dataset"],
    artifactPaths: [],
    evidenceSources: ["import metadata", "dataset output", "attachment evidence"],
    evidenceDetails: [
      {
        kind: "import_metadata",
        label: "Import metadata",
        detail: "Vendor: grok | Title clues: Sports digest | Topic hints: sports updates"
      }
    ],
    nextAction: "open_dataset",
    nextActionLabel: "Open Dataset View next"
  }
];

const rankedForCrypto = rankRetrievalEntries(entries, {
  text: "crypto updates",
  vendor: "claude",
  topic: "crypto"
});

assert.equal(rankedForCrypto[0].entry.filePath, entries[0].filePath, "Expected Claude crypto result to rank first");
assert.ok(rankedForCrypto[0].score > rankedForCrypto[1].score, "Expected stronger match to score higher");
assert.ok(rankedForCrypto[0].reasons.includes("vendor match"), "Expected vendor match reason");
assert.ok(rankedForCrypto[0].reasons.some((reason) => reason.includes("topic")), "Expected topic match reason");
assert.ok(
  rankedForCrypto[0].reasons.some((reason) => reason.includes("title clue") || reason.includes("title clues")),
  "Expected ranking reasons to explain title-based evidence matches"
);

const rankedForSports = rankRetrievalEntries(entries, {
  text: "sports",
  vendor: "",
  topic: ""
});

assert.equal(rankedForSports[0].entry.filePath, entries[1].filePath, "Expected sports query to rank sports result first");

const rankedForAdjacentWording = rankRetrievalEntries(entries, {
  text: "crypto market update",
  vendor: "",
  topic: ""
});

assert.equal(
  rankedForAdjacentWording[0].entry.filePath,
  entries[0].filePath,
  "Expected singular/plural wording drift like market/markets and update/updates to still find the strongest result"
);

console.log("retrieval-ranking.test.ts passed");
