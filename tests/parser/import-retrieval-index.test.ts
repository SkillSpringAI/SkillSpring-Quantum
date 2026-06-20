import assert from "node:assert";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { readJsonFile } from "../../core/utils/fs.js";
import {
  writeImportRetrievalIndex,
  type ImportRetrievalIndexManifest
} from "../../core/imports/importRetrievalIndex.js";
import type { ImportRunSummary } from "../../core/imports/sourceIntake.js";

const tempRoot = await mkdtemp(path.join(os.tmpdir(), "skillspring-retrieval-index-"));

try {
  const runOne: ImportRunSummary = {
    runAt: "2026-06-18T09:00:00.000Z",
    inputPath: "C:\\Exports\\claude",
    outputRoot: tempRoot,
    historyPath: path.join(tempRoot, "imports", "history", "run1.json"),
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
      topicHints: ["crypto markets"],
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
          conversationIds: ["claude-conversation-1"],
          vendorSources: ["claude"],
          conversationCount: 2,
          messageCount: 8,
          participantCount: 2,
          attachmentCount: 0,
          startedAt: "2026-03-10T12:00:00.000Z",
          endedAt: "2026-03-11T12:00:00.000Z",
          sampleTitles: ["Claude Export Sample"],
          topicHints: ["crypto markets"]
        }
      }
    ]
  };

  const runTwo: ImportRunSummary = {
    ...runOne,
    runAt: "2026-06-18T10:00:00.000Z",
    inputPath: "C:\\Exports\\grok",
    historyPath: path.join(tempRoot, "imports", "history", "run2.json"),
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
          conversationIds: ["grok-conversation-1"],
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
  };

  const firstWrite = await writeImportRetrievalIndex(tempRoot, runOne);
  let manifest = await readJsonFile<ImportRetrievalIndexManifest>(firstWrite.latestPath);
  assert.equal(manifest.runCount, 1, "Expected first write to create one run");
  assert.equal(manifest.entryCount, 1, "Expected first write to create one entry");
  assert.deepEqual(manifest.supportTiers, ["mvp_compatibility_fallback"]);
  assert.deepEqual(manifest.vendorSources, ["claude"]);

  await writeImportRetrievalIndex(tempRoot, runTwo);
  manifest = await readJsonFile<ImportRetrievalIndexManifest>(firstWrite.latestPath);
  assert.equal(manifest.runCount, 2, "Expected second write to append another run");
  assert.equal(manifest.entryCount, 2, "Expected second write to append another entry");
  assert.deepEqual(manifest.supportTiers, ["mvp_first_class", "mvp_compatibility_fallback"]);
  assert.deepEqual(manifest.vendorSources, ["claude", "grok"]);
  assert.ok(manifest.topicHints.includes("crypto markets"), "Expected merged topics to include first run");
  assert.ok(manifest.topicHints.includes("sports updates"), "Expected merged topics to include second run");
  assert.equal(manifest.runs[0].runAt, runTwo.runAt, "Expected latest run to sort first");

  console.log("import-retrieval-index.test.ts passed");
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}
