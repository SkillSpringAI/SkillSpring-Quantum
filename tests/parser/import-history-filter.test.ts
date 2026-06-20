import assert from "node:assert";
import { filterImportRunResults, filterImportRuns } from "../../core/imports/filterImportHistory.js";
import type { ImportRunSummary } from "../../core/imports/sourceIntake.js";

const runs: ImportRunSummary[] = [
  {
    runAt: "2026-06-18T09:00:00.000Z",
    inputPath: "C:\\Exports\\claude",
    outputRoot: "organized_output",
    historyPath: "organized_output\\imports\\history\\run1.json",
    filesDiscovered: 1,
    filesImported: 1,
    filesFailed: 0,
    conversationFilesProcessed: 1,
    genericDocumentsProcessed: 0,
    pdfFilesArchived: 0,
    archivedOnlyFiles: 0,
    recoveryPathFiles: 1,
    unsupportedFilesSkipped: 0,
    artifacts: [],
    retrievalSummary: {
      supportTiers: ["mvp_compatibility_fallback"],
      vendorSources: ["claude"],
      topicHints: ["crypto markets", "portfolio review"],
      startedAt: "2026-03-10T12:00:00.000Z",
      endedAt: "2026-03-11T12:00:00.000Z",
      conversationFiles: 1,
      conversationCount: 2,
      messageCount: 8,
      attachmentCount: 0
    },
    results: [
      {
        path: "C:\\Exports\\claude\\conversation.json",
        kind: "conversation_json",
        status: "imported",
        message: "Conversation import processed.",
        metadata: {
          sourceCategory: "conversation",
          detectedKind: "generic_conversation",
          detectedLabel: "Claude conversation JSON",
          supportTier: "mvp_compatibility_fallback",
          vendorSources: ["claude"],
          conversationCount: 2,
          messageCount: 8,
          participantCount: 2,
          attachmentCount: 0,
          startedAt: "2026-03-10T12:00:00.000Z",
          endedAt: "2026-03-11T12:00:00.000Z",
          sampleTitles: ["Claude Export Sample"],
          topicHints: ["crypto markets", "portfolio review"]
        }
      }
    ]
  },
  {
    runAt: "2026-06-18T10:00:00.000Z",
    inputPath: "C:\\Exports\\grok",
    outputRoot: "organized_output",
    historyPath: "organized_output\\imports\\history\\run2.json",
    filesDiscovered: 1,
    filesImported: 1,
    filesFailed: 0,
    conversationFilesProcessed: 1,
    genericDocumentsProcessed: 0,
    pdfFilesArchived: 0,
    archivedOnlyFiles: 0,
    recoveryPathFiles: 0,
    unsupportedFilesSkipped: 0,
    artifacts: [],
    retrievalSummary: {
      supportTiers: ["mvp_first_class"],
      vendorSources: ["grok"],
      topicHints: ["sports updates"],
      startedAt: "2026-05-02T09:00:00.000Z",
      endedAt: "2026-05-02T10:00:00.000Z",
      conversationFiles: 1,
      conversationCount: 1,
      messageCount: 4,
      attachmentCount: 1
    },
    results: [
      {
        path: "C:\\Exports\\grok\\prod-grok-backend.json",
        kind: "conversation_json",
        status: "imported",
        message: "Conversation import processed.",
        metadata: {
          sourceCategory: "conversation",
          detectedKind: "grok_export",
          detectedLabel: "Grok export",
          supportTier: "mvp_first_class",
          vendorSources: ["grok"],
          conversationCount: 1,
          messageCount: 4,
          participantCount: 2,
          attachmentCount: 1,
          startedAt: "2026-05-02T09:00:00.000Z",
          endedAt: "2026-05-02T10:00:00.000Z",
          sampleTitles: ["Sports chat"],
          topicHints: ["sports updates"]
        }
      }
    ]
  }
];

assert.equal(filterImportRuns(runs, { vendor: "claude" }).length, 1, "Expected vendor filter to isolate Claude run");
assert.equal(filterImportRuns(runs, { topic: "crypto" }).length, 1, "Expected topic filter to isolate crypto run");
assert.equal(filterImportRuns(runs, { from: "2026-04-01T00:00:00.000Z" }).length, 1, "Expected date filter to exclude older run");
assert.equal(filterImportRuns(runs, { text: "prod-grok-backend" }).length, 1, "Expected text filter to match Grok file path");
assert.equal(filterImportRuns(runs, { status: "failed" }).length, 0, "Expected failed-status run filter to return none");

const filteredResults = filterImportRunResults(runs[0].results, { vendor: "claude", topic: "crypto" });
assert.equal(filteredResults.length, 1, "Expected result filter to keep Claude crypto file");
assert.equal(filterImportRunResults(runs[0].results, { vendor: "grok" }).length, 0, "Expected result vendor filter to exclude non-matching files");

console.log("import-history-filter.test.ts passed");
