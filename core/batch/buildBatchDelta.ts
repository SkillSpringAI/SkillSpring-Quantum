import path from "node:path";
import { promises as fs } from "node:fs";
import { ensureDir, readJsonFile, writeTextFile } from "../utils/fs.js";

interface AggregateBatchDiagnostics {
  generated_at: string;
  output_root: string;
  files_attempted: number;
  files_succeeded: number;
  files_failed: number;
  diagnostic_files_found: number;
  totals: {
    conversations_found: number;
    segments_created: number;
    segments_purged: number;
    markdown_primary_written: number;
    duplicates_skipped: number;
    backups_written: number;
    archived_existing: number;
    dataset_topic_segments: number;
    dataset_prompt_response_pairs: number;
    dataset_micro_segments: number;
    dataset_private_review_segments: number;
    warnings: number;
    errors: number;
  };
  rates: {
    duplicate_rate: number;
    private_review_rate: number;
    segment_yield: number;
    purge_rate: number;
  };
  health_checks: {
    duplicate_rate_warning: boolean;
    private_review_rate_warning: boolean;
    low_segment_yield_warning: boolean;
    purge_rate_warning: boolean;
  };
  failed_files: string[];
  recommendation: string[];
}

interface BatchDeltaReport {
  generated_at: string;
  current_file: string;
  previous_file: string | null;
  comparable: boolean;
  delta: {
    conversations_found: number;
    segments_created: number;
    segments_purged: number;
    duplicates_skipped: number;
    dataset_topic_segments: number;
    dataset_prompt_response_pairs: number;
    dataset_micro_segments: number;
    dataset_private_review_segments: number;
    duplicate_rate: number;
    private_review_rate: number;
    segment_yield: number;
    purge_rate: number;
  } | null;
  recommendation: string[];
}

function listAggregateSnapshots(dir: string): Promise<string[]> {
  return fs.readdir(dir).then(files =>
    files
      .filter(name => /^batch-aggregate-diagnostics.*\.json$/i.test(name))
      .sort()
  );
}

function buildRecommendations(delta: NonNullable<BatchDeltaReport["delta"]>): string[] {
  const items: string[] = [];

  if (delta.duplicate_rate > 0.02) {
    items.push("Duplicate rate increased. Tighten alias collapse, merge rules, or dedupe logic.");
  }

  if (delta.private_review_rate > 0.02) {
    items.push("Private-review rate increased. Review redaction triggers and content classification.");
  }

  if (delta.purge_rate > 0.03) {
    items.push("Purge rate increased. Check if waste rules are cutting too aggressively.");
  }

  if (delta.segment_yield < -0.1) {
    items.push("Segment yield dropped. Review segmentation window size and categorization quality.");
  }

  if (items.length === 0) {
    items.push("No major negative drift detected relative to the previous batch snapshot.");
  }

  return items;
}

async function main(): Promise<void> {
  const outputRoot = process.argv[2] || "organized_output";
  const diagnosticsDir = path.join(outputRoot, "diagnostics");
  const snapshotsDir = path.join(diagnosticsDir, "batch-history");

  await ensureDir(snapshotsDir);

  const currentAggregatePath = path.join(diagnosticsDir, "batch-aggregate-diagnostics.json");
  const current = await readJsonFile<AggregateBatchDiagnostics>(currentAggregatePath);

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const snapshotName = "batch-aggregate-diagnostics-" + timestamp + ".json";
  const snapshotPath = path.join(snapshotsDir, snapshotName);

  await writeTextFile(snapshotPath, JSON.stringify(current, null, 2));

  const snapshots = await listAggregateSnapshots(snapshotsDir);
  const previousSnapshots = snapshots.filter(name => name !== snapshotName);
  const previousName = previousSnapshots.length > 0 ? previousSnapshots[previousSnapshots.length - 1] : null;

  let report: BatchDeltaReport;

  if (!previousName) {
    report = {
      generated_at: new Date().toISOString(),
      current_file: snapshotPath,
      previous_file: null,
      comparable: false,
      delta: null,
      recommendation: ["No previous batch snapshot exists yet. Run batch diagnostics again after a later pass to compare changes."]
    };
  } else {
    const previousPath = path.join(snapshotsDir, previousName);
    const previous = await readJsonFile<AggregateBatchDiagnostics>(previousPath);

    const delta = {
      conversations_found: current.totals.conversations_found - previous.totals.conversations_found,
      segments_created: current.totals.segments_created - previous.totals.segments_created,
      segments_purged: current.totals.segments_purged - previous.totals.segments_purged,
      duplicates_skipped: current.totals.duplicates_skipped - previous.totals.duplicates_skipped,
      dataset_topic_segments: current.totals.dataset_topic_segments - previous.totals.dataset_topic_segments,
      dataset_prompt_response_pairs: current.totals.dataset_prompt_response_pairs - previous.totals.dataset_prompt_response_pairs,
      dataset_micro_segments: current.totals.dataset_micro_segments - previous.totals.dataset_micro_segments,
      dataset_private_review_segments: current.totals.dataset_private_review_segments - previous.totals.dataset_private_review_segments,
      duplicate_rate: current.rates.duplicate_rate - previous.rates.duplicate_rate,
      private_review_rate: current.rates.private_review_rate - previous.rates.private_review_rate,
      segment_yield: current.rates.segment_yield - previous.rates.segment_yield,
      purge_rate: current.rates.purge_rate - previous.rates.purge_rate
    };

    report = {
      generated_at: new Date().toISOString(),
      current_file: snapshotPath,
      previous_file: previousPath,
      comparable: true,
      delta,
      recommendation: buildRecommendations(delta)
    };
  }

  const deltaPath = path.join(diagnosticsDir, "batch-delta-report.json");
  await writeTextFile(deltaPath, JSON.stringify(report, null, 2));

  console.log("Batch delta report created.");
  console.log({
    snapshotPath,
    deltaPath,
    comparable: report.comparable,
    previousFile: report.previous_file
  });
}

main().catch((error) => {
  console.error("Batch delta diagnostics failed:", error);
  process.exit(1);
});
