import path from "node:path";
import { readJsonFile, ensureDir, writeTextFile } from "../utils/fs.js";
import type { RunDiagnostics } from "./types.js";

interface DiagnosticReport {
  latest_run_id: string;
  status: string;
  summary: {
    files_processed: number;
    conversations_found: number;
    raw_conversations_written: number;
    raw_conversations_skipped: number;
    segments_created: number;
    segments_purged: number;
    dataset_topic_segments: number;
    dataset_prompt_response_pairs: number;
    dataset_micro_segments: number;
    dataset_private_review_segments: number;
    warnings: number;
    errors: number;
  };
  health_checks: {
    duplicate_rate_warning: boolean;
    private_review_rate_warning: boolean;
    low_segment_yield_warning: boolean;
    purge_rate_warning: boolean;
  };
  recommendation: string[];
}

function buildRecommendations(d: RunDiagnostics): string[] {
  const items: string[] = [];

  if (d.health_checks.duplicate_rate_warning) {
    items.push("Duplicate rate is high. Tighten canonical grouping or dedupe logic.");
  }

  if (d.health_checks.private_review_rate_warning) {
    items.push("Private review rate is elevated. Review redaction coverage and filtering rules.");
  }

  if (d.health_checks.low_segment_yield_warning) {
    items.push("Segment yield is low relative to conversations found. Review segmentation window size and topic drift logic.");
  }

  if (d.health_checks.purge_rate_warning) {
    items.push("Purge rate is high. Review waste rules so useful material is not being over-cut.");
  }

  if (d.errors.length > 0) {
    items.push("Errors were recorded. Check diagnostics/failures and latest-run.json.");
  }

  if (items.length === 0) {
    items.push("No major diagnostic concerns detected in the latest run.");
  }

  return items;
}

async function main(): Promise<void> {
  const outputRoot = process.argv[2] || "output";
  const diagnosticsPath = path.join(outputRoot, "diagnostics", "latest-run.json");
  const reportDir = path.join(outputRoot, "diagnostics");
  const reportPath = path.join(reportDir, "health-report.json");

  const latest = await readJsonFile<RunDiagnostics>(diagnosticsPath);

  const report: DiagnosticReport = {
    latest_run_id: latest.run_id,
    status: latest.status,
    summary: {
      files_processed: latest.files_processed,
      conversations_found: latest.conversations_found,
      raw_conversations_written: latest.raw_conversations_written,
      raw_conversations_skipped: latest.raw_conversations_skipped,
      segments_created: latest.segments_created,
      segments_purged: latest.segments_purged,
      dataset_topic_segments: latest.dataset_topic_segments,
      dataset_prompt_response_pairs: latest.dataset_prompt_response_pairs,
      dataset_micro_segments: latest.dataset_micro_segments,
      dataset_private_review_segments: latest.dataset_private_review_segments,
      warnings: latest.warnings.length,
      errors: latest.errors.length
    },
    health_checks: latest.health_checks,
    recommendation: buildRecommendations(latest)
  };

  await ensureDir(reportDir);
  await writeTextFile(reportPath, JSON.stringify(report, null, 2));

  console.log("Diagnostic health report created:");
  console.log(report);
}

main().catch((error) => {
  console.error("Diagnostic runner failed:", error);
  process.exit(1);
});
