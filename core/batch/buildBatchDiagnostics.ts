import path from "node:path";
import { promises as fs } from "node:fs";
import { ensureDir, readJsonFile, writeTextFile } from "../utils/fs.js";
import { loadSignalThresholdRules } from "../governance/loadRules.js";
import type { RunDiagnostics } from "../diagnostics/types.js";

interface BatchRunReportEntry {
  file: string;
  status: "success" | "failed";
  exit_code: number | null;
  stdout: string;
  stderr: string;
}

interface BatchRunReport {
  run_at: string;
  input_folder: string;
  output_root: string;
  files_attempted: number;
  files_succeeded: number;
  files_failed: number;
  results: BatchRunReportEntry[];
}

interface AggregateBatchDiagnostics {
  generated_at: string;
  output_root: string;
  files_attempted: number;
  files_succeeded: number;
  files_failed: number;
  diagnostic_files_found: number;
  totals: {
    conversations_found: number;
    raw_conversations_written: number;
    raw_conversations_skipped: number;
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

function buildRecommendations(report: AggregateBatchDiagnostics): string[] {
  const items: string[] = [];

  if (report.health_checks.duplicate_rate_warning) {
    items.push("Batch duplicate rate is high. Tighten alias collapse, merge rules, or dedupe logic.");
  }

  if (report.health_checks.private_review_rate_warning) {
    items.push("Batch private-review rate is high. Tighten redaction triggers or improve content classification.");
  }

  if (report.health_checks.low_segment_yield_warning) {
    items.push("Batch segment yield is low. Review segmentation window size and categorization process.");
  }

  if (report.health_checks.purge_rate_warning) {
    items.push("Batch purge rate is high. Review waste classification so useful material is not being over-cut.");
  }

  if (report.files_failed > 0) {
    items.push("Some shard files failed. Review batch-run-report.json and per-file stderr output.");
  }

  if (items.length === 0) {
    items.push("No major batch-level issues detected.");
  }

  return items;
}

async function main(): Promise<void> {
  const outputRoot = process.argv[2] || "organized_output";
  const diagnosticsDir = path.join(outputRoot, "diagnostics");
  const historyDir = path.join(diagnosticsDir, "history");
  const batchRunReportPath = path.join(diagnosticsDir, "batch-run-report.json");

  const signalRules = loadSignalThresholdRules();
  const batchReport = await readJsonFile<BatchRunReport>(batchRunReportPath);

  const historyEntries = await fs.readdir(historyDir);
  const diagnosticFiles = historyEntries.filter(name => name.endsWith(".json"));

  const totals = {
    conversations_found: 0,
    raw_conversations_written: 0,
    raw_conversations_skipped: 0,
    segments_created: 0,
    segments_purged: 0,
    markdown_primary_written: 0,
    duplicates_skipped: 0,
    backups_written: 0,
    archived_existing: 0,
    dataset_topic_segments: 0,
    dataset_prompt_response_pairs: 0,
    dataset_micro_segments: 0,
    dataset_private_review_segments: 0,
    warnings: 0,
    errors: 0
  };

  for (const fileName of diagnosticFiles) {
    const fullPath = path.join(historyDir, fileName);
    const d = await readJsonFile<RunDiagnostics>(fullPath);

    totals.conversations_found += d.conversations_found;
    totals.raw_conversations_written += d.raw_conversations_written;
    totals.raw_conversations_skipped += d.raw_conversations_skipped;
    totals.segments_created += d.segments_created;
    totals.segments_purged += d.segments_purged;
    totals.markdown_primary_written += d.markdown_primary_written;
    totals.duplicates_skipped += d.duplicates_skipped;
    totals.backups_written += d.backups_written;
    totals.archived_existing += d.archived_existing;
    totals.dataset_topic_segments += d.dataset_topic_segments;
    totals.dataset_prompt_response_pairs += d.dataset_prompt_response_pairs;
    totals.dataset_micro_segments += d.dataset_micro_segments;
    totals.dataset_private_review_segments += d.dataset_private_review_segments;
    totals.warnings += d.warnings.length;
    totals.errors += d.errors.length;
  }

  const duplicateRate =
    totals.segments_created > 0
      ? totals.duplicates_skipped / totals.segments_created
      : 0;

  const privateReviewRate =
    totals.dataset_topic_segments > 0
      ? totals.dataset_private_review_segments / totals.dataset_topic_segments
      : 0;

  const segmentYield =
    totals.conversations_found > 0
      ? totals.dataset_topic_segments / totals.conversations_found
      : 0;

  const purgeRate =
    totals.segments_created > 0
      ? totals.segments_purged / totals.segments_created
      : 0;

  const aggregate: AggregateBatchDiagnostics = {
    generated_at: new Date().toISOString(),
    output_root: outputRoot,
    files_attempted: batchReport.files_attempted,
    files_succeeded: batchReport.files_succeeded,
    files_failed: batchReport.files_failed,
    diagnostic_files_found: diagnosticFiles.length,
    totals,
    rates: {
      duplicate_rate: duplicateRate,
      private_review_rate: privateReviewRate,
      segment_yield: segmentYield,
      purge_rate: purgeRate
    },
    health_checks: {
      duplicate_rate_warning: duplicateRate > signalRules.health_thresholds.duplicate_rate_warning,
      private_review_rate_warning: privateReviewRate > signalRules.health_thresholds.private_review_rate_warning,
      low_segment_yield_warning: segmentYield < signalRules.health_thresholds.low_segment_yield_warning,
      purge_rate_warning: purgeRate > signalRules.health_thresholds.purge_rate_warning
    },
    failed_files: batchReport.results.filter(r => r.status === "failed").map(r => r.file),
    recommendation: []
  };

  aggregate.recommendation = buildRecommendations(aggregate);

  const aggregatePath = path.join(diagnosticsDir, "batch-aggregate-diagnostics.json");
  const healthPath = path.join(diagnosticsDir, "batch-health-report.json");

  await ensureDir(diagnosticsDir);
  await writeTextFile(aggregatePath, JSON.stringify(aggregate, null, 2));
  await writeTextFile(
    healthPath,
    JSON.stringify(
      {
        generated_at: aggregate.generated_at,
        health_checks: aggregate.health_checks,
        recommendation: aggregate.recommendation,
        rates: aggregate.rates
      },
      null,
      2
    )
  );

  console.log("Batch aggregate diagnostics created.");
  console.log({
    aggregatePath,
    healthPath,
    filesAttempted: aggregate.files_attempted,
    filesSucceeded: aggregate.files_succeeded,
    filesFailed: aggregate.files_failed,
    duplicateRate: aggregate.rates.duplicate_rate,
    privateReviewRate: aggregate.rates.private_review_rate,
    segmentYield: aggregate.rates.segment_yield,
    purgeRate: aggregate.rates.purge_rate
  });
}

main().catch((error) => {
  console.error("Batch aggregate diagnostics failed:", error);
  process.exit(1);
});
