import assert from "node:assert";
import os from "node:os";
import path from "node:path";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";

const tempRoot = await mkdtemp(path.join(os.tmpdir(), "skillspring-read-dataset-runs-"));

try {
  const datasetsManifestsDir = path.join(tempRoot, "datasets", "manifests");
  const dbManifestsDir = path.join(tempRoot, "db", "manifests");
  await mkdir(datasetsManifestsDir, { recursive: true });
  await mkdir(dbManifestsDir, { recursive: true });

  const olderRun = {
    run_id: "run-2026-06-20T09-00-00-000Z",
    dataset_version: "v1",
    redaction_summary: {
      affected_segments: 0,
      total_redactions: 0,
      redaction_types: {}
    },
    topic_segments: 2,
    prompt_response_pairs: 3,
    micro_segments: 4,
    private_review_segments: 0,
    filtered_out_segments: 0,
    topics: { alpha: 2 },
    tiers: { high_signal: 2, low_signal: 0, private_review: 0 },
    db_write_stats: {}
  };

  const newerRun = {
    run_id: "run-2026-06-20T10-00-00-000Z",
    dataset_version: "v1",
    source_context: {
      pipeline_run_id: "pipeline-run-10",
      detected_label: "Claude export",
      vendor_sources: ["claude"],
      topic_hints: ["beta"],
      support_tier: "mvp_compatibility_fallback"
    },
    redaction_summary: {
      affected_segments: 2,
      total_redactions: 3,
      redaction_types: {
        email: 1,
        phone: 2
      }
    },
    topic_segments: 5,
    prompt_response_pairs: 6,
    micro_segments: 7,
    private_review_segments: 1,
    filtered_out_segments: 0,
    topics: { beta: 5 },
    tiers: { high_signal: 4, low_signal: 0, private_review: 1 },
    db_write_stats: {}
  };

  await writeFile(
    path.join(datasetsManifestsDir, olderRun.run_id + ".json"),
    JSON.stringify(olderRun, null, 2),
    "utf-8"
  );
  await writeFile(
    path.join(datasetsManifestsDir, newerRun.run_id + ".json"),
    JSON.stringify(newerRun, null, 2),
    "utf-8"
  );
  await writeFile(
    path.join(dbManifestsDir, "latest-dataset-run.json"),
    JSON.stringify(newerRun, null, 2),
    "utf-8"
  );

  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const execFileAsync = promisify(execFile);
  const output = await execFileAsync(
    process.execPath,
    [
      path.join("node_modules", "tsx", "dist", "cli.mjs"),
      path.join("core", "pipeline", "readLatestDatasetRun.ts"),
      tempRoot,
      "2"
    ],
    { cwd: process.cwd() }
  );

  const parsed = JSON.parse(output.stdout) as {
    latest: typeof newerRun | null;
    runs: Array<typeof olderRun | typeof newerRun>;
  };

  assert.equal(parsed.latest?.run_id, newerRun.run_id);
  assert.equal(parsed.runs.length, 2);
  assert.equal(parsed.runs[0].run_id, newerRun.run_id);
  assert.equal(parsed.runs[1].run_id, olderRun.run_id);
  assert.equal(parsed.runs[0].source_context?.detected_label, "Claude export");
  assert.equal(parsed.runs[0].redaction_summary?.total_redactions, 3);

  console.log("read-latest-dataset-run.test.ts passed");
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}
