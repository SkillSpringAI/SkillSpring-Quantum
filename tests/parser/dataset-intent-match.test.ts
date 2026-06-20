import assert from "node:assert";
import { findMatchingDatasetRun } from "../../ui/app/src/utils/datasetIntent";
import type { DatasetRunResult } from "../../ui/app/src/types/datasetRun";

const runs: DatasetRunResult["runs"] = [
  {
    run_id: "run-2026-06-20T10-00-00-000Z",
    dataset_version: "v1",
    source_context: {
      pipeline_run_id: "pipeline-1",
      detected_label: "Claude export",
      support_tier: "mvp_compatibility_fallback",
      vendor_sources: ["claude"],
      topic_hints: ["crypto markets"]
    },
    topic_segments: 2,
    prompt_response_pairs: 2,
    micro_segments: 2,
    private_review_segments: 0,
    filtered_out_segments: 0,
    topics: {},
    tiers: {},
    db_write_stats: {}
  },
  {
    run_id: "run-2026-06-21T10-00-00-000Z",
    dataset_version: "v1",
    source_context: {
      pipeline_run_id: "pipeline-2",
      detected_label: "Gemini export",
      support_tier: "mvp_compatibility_fallback",
      vendor_sources: ["gemini"],
      topic_hints: ["product roadmap"]
    },
    topic_segments: 3,
    prompt_response_pairs: 3,
    micro_segments: 3,
    private_review_segments: 0,
    filtered_out_segments: 0,
    topics: {},
    tiers: {},
    db_write_stats: {}
  }
];

const claudeMatch = findMatchingDatasetRun(runs, {
  vendor: "claude",
  topic: "crypto"
});
assert.equal(claudeMatch?.run_id, runs[0].run_id, "Expected vendor/topic match to pick Claude dataset run");

const geminiTopicMatch = findMatchingDatasetRun(runs, {
  topic: "roadmap"
});
assert.equal(geminiTopicMatch?.run_id, runs[1].run_id, "Expected topic-only match to pick Gemini dataset run");

const fallbackMatch = findMatchingDatasetRun(runs, {
  vendor: "copilot"
});
assert.equal(fallbackMatch?.run_id, runs[0].run_id, "Expected unknown vendor to fall back to the first available run");

console.log("dataset-intent-match.test.ts passed");
