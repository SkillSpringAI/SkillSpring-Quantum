import assert from "node:assert";
import { findMatchingDatasetRunDetails } from "../../ui/app/src/utils/datasetIntent";
import type { DatasetRunResult } from "../../ui/app/src/types/datasetRun";

const runs: DatasetRunResult["runs"] = [
  {
    run_id: "run-passport",
    dataset_version: "v1",
    source_context: {
      pipeline_run_id: "run-passport",
      vendor_sources: ["claude"],
      topic_hints: ["passport appointments", "travel documents"]
    },
    topic_segments: 10,
    prompt_response_pairs: 6,
    micro_segments: 4,
    private_review_segments: 0,
    filtered_out_segments: 0,
    topics: {},
    tiers: {},
    db_write_stats: {}
  },
  {
    run_id: "run-sports",
    dataset_version: "v1",
    source_context: {
      pipeline_run_id: "run-sports",
      vendor_sources: ["grok"],
      topic_hints: ["sports updates"]
    },
    topic_segments: 4,
    prompt_response_pairs: 2,
    micro_segments: 2,
    private_review_segments: 0,
    filtered_out_segments: 0,
    topics: {},
    tiers: {},
    db_write_stats: {}
  }
];

const match = findMatchingDatasetRunDetails(runs, {
  vendor: "claude",
  topic: "Passport Appointment Decision",
  rawTopic: "passport appointment documents"
});

assert.equal(match.run?.run_id, "run-passport", "Expected retrieval handoff to match the passport dataset run");
assert.equal(match.matchedVendor, true, "Expected vendor handoff to match");
assert.equal(match.matchedTopic, true, "Expected adjacent topic wording to match");

console.log("dataset-intent.test.ts passed");
