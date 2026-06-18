import assert from "node:assert";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { readJsonFile } from "../../core/utils/fs.js";
import {
  deleteRetrievalView,
  saveRetrievalView,
  savedViewsPath,
  type RetrievalSavedViewsManifest
} from "../../core/retrieval/savedViews.js";

const tempRoot = await mkdtemp(path.join(os.tmpdir(), "skillspring-saved-views-"));

try {
  let result = await saveRetrievalView({
    outputRoot: tempRoot,
    name: "Crypto Spring",
    filters: {
      text: "crypto updates",
      vendor: "claude",
      topic: "markets",
      status: "imported",
      from: "2026-02-01",
      to: "2026-05-31"
    },
    selectedRecord: {
      runAt: "2026-06-18T09:00:00.000Z",
      filePath: "C:\\Exports\\claude\\conversation.json"
    },
    selectedSegment: {
      runId: "dataset-run-1",
      conversationId: "claude-conversation-1",
      startIndex: 0,
      endIndex: 4
    }
  });

  assert.equal(result.latest?.views.length, 1, "Expected one saved view after first save");
  assert.equal(result.latest?.views[0].id, "crypto-spring");
  assert.equal(result.latest?.views[0].selectedRecord?.filePath, "C:\\Exports\\claude\\conversation.json");
  assert.equal(result.latest?.views[0].selectedSegment?.conversationId, "claude-conversation-1");

  result = await saveRetrievalView({
    outputRoot: tempRoot,
    name: "Crypto Spring",
    filters: {
      text: "crypto updates",
      vendor: "grok",
      topic: "markets",
      status: "all",
      from: "2026-02-01",
      to: "2026-05-31"
    },
    selectedRecord: {
      runAt: "2026-06-18T10:00:00.000Z",
      filePath: "C:\\Exports\\grok\\prod-grok-backend.json"
    }
  });

  assert.equal(result.latest?.views.length, 1, "Expected name match to update existing view");
  assert.equal(result.latest?.views[0].filters.vendor, "grok");
  assert.equal(result.latest?.views[0].selectedRecord?.filePath, "C:\\Exports\\grok\\prod-grok-backend.json");

  result = await saveRetrievalView({
    outputRoot: tempRoot,
    name: "Support Review",
    filters: {
      text: "refund",
      vendor: "",
      topic: "support",
      status: "failed",
      from: "",
      to: ""
    }
  });

  assert.equal(result.latest?.views.length, 2, "Expected second unique view to be added");

  const manifest = await readJsonFile<RetrievalSavedViewsManifest>(savedViewsPath(tempRoot));
  assert.equal(manifest.schemaVersion, "retrieval_saved_views.v1");

  result = await deleteRetrievalView({
    outputRoot: tempRoot,
    id: "crypto-spring"
  });

  assert.equal(result.latest?.views.length, 1, "Expected delete to remove one saved view");
  assert.equal(result.latest?.views[0].name, "Support Review");

  console.log("retrieval-saved-views.test.ts passed");
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}
