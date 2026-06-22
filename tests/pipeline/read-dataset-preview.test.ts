import assert from "node:assert";
import os from "node:os";
import path from "node:path";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";

const tempRoot = await mkdtemp(path.join(os.tmpdir(), "skillspring-read-dataset-preview-"));

try {
  const datasetsManifestsDir = path.join(tempRoot, "datasets", "manifests");
  const runRoot = path.join(tempRoot, "datasets", "runs", "run-2026-06-22T10-00-00-000Z");
  const currentRoot = path.join(tempRoot, "datasets", "current");
  const privateReviewRoot = path.join(tempRoot, "db", "tier3_private_review");
  const dbManifestsDir = path.join(tempRoot, "db", "manifests");
  await mkdir(datasetsManifestsDir, { recursive: true });
  await mkdir(runRoot, { recursive: true });
  await mkdir(currentRoot, { recursive: true });
  await mkdir(privateReviewRoot, { recursive: true });
  await mkdir(dbManifestsDir, { recursive: true });

  const runSummary = {
    run_id: "run-2026-06-22T10-00-00-000Z",
    dataset_version: "v1",
    topic_segments: 1,
    prompt_response_pairs: 1,
    micro_segments: 1,
    private_review_segments: 1,
    filtered_out_segments: 0,
    topics: {},
    tiers: {},
    db_write_stats: {}
  };

  await writeFile(
    path.join(datasetsManifestsDir, runSummary.run_id + ".json"),
    JSON.stringify(runSummary, null, 2),
    "utf-8"
  );
  await writeFile(
    path.join(dbManifestsDir, "latest-dataset-run.json"),
    JSON.stringify(runSummary, null, 2),
    "utf-8"
  );

  await writeFile(
    path.join(runRoot, "topic_segments.jsonl"),
    JSON.stringify({ conversation_id: "historical-1", start_index: 0, title: "Historical topic" }) + "\n",
    "utf-8"
  );
  await writeFile(
    path.join(runRoot, "private_review_topic_segments.jsonl"),
    JSON.stringify({ conversation_id: "historical-private-1", start_index: 2, title: "Historical private review" }) + "\n",
    "utf-8"
  );
  await writeFile(
    path.join(currentRoot, "topic_segments.jsonl"),
    JSON.stringify({ conversation_id: "current-1", start_index: 0, title: "Current topic" }) + "\n",
    "utf-8"
  );
  await writeFile(
    path.join(privateReviewRoot, "topic_segments.jsonl"),
    JSON.stringify({ conversation_id: "current-private-1", start_index: 4, title: "Current private review" }) + "\n",
    "utf-8"
  );

  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const execFileAsync = promisify(execFile);

  const historicalOutput = await execFileAsync(
    process.execPath,
    [
      path.join("node_modules", "tsx", "dist", "cli.mjs"),
      path.join("core", "pipeline", "readDatasetPreview.ts"),
      tempRoot,
      runSummary.run_id,
      "topic_segments",
      "5",
      "0"
    ],
    { cwd: process.cwd() }
  );

  const historicalParsed = JSON.parse(historicalOutput.stdout) as {
    scope: string;
    records: Array<{ conversation_id: string }>;
  };
  assert.equal(historicalParsed.scope, "historical_run");
  assert.equal(historicalParsed.records[0]?.conversation_id, "historical-1");

  const privateReviewOutput = await execFileAsync(
    process.execPath,
    [
      path.join("node_modules", "tsx", "dist", "cli.mjs"),
      path.join("core", "pipeline", "readDatasetPreview.ts"),
      tempRoot,
      runSummary.run_id,
      "private_review",
      "5",
      "0"
    ],
    { cwd: process.cwd() }
  );

  const privateReviewParsed = JSON.parse(privateReviewOutput.stdout) as {
    scope: string;
    records: Array<{ conversation_id: string }>;
  };
  assert.equal(privateReviewParsed.scope, "historical_run");
  assert.equal(privateReviewParsed.records[0]?.conversation_id, "historical-private-1");

  const fallbackRunId = "run-2026-06-20T10-00-00-000Z";
  const fallbackOutput = await execFileAsync(
    process.execPath,
    [
      path.join("node_modules", "tsx", "dist", "cli.mjs"),
      path.join("core", "pipeline", "readDatasetPreview.ts"),
      tempRoot,
      fallbackRunId,
      "topic_segments",
      "5",
      "0"
    ],
    { cwd: process.cwd() }
  );

  const fallbackParsed = JSON.parse(fallbackOutput.stdout) as {
    scope: string;
    records: Array<{ conversation_id: string }>;
  };
  assert.equal(fallbackParsed.scope, "latest_current_bundle");
  assert.equal(fallbackParsed.records[0]?.conversation_id, "current-1");

  console.log("read-dataset-preview.test.ts passed");
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}
