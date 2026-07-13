import path from "node:path";
import { loadReviewQueueRules } from "../governance/loadRules.js";
import { ensureDir, fileExists, writeTextFile } from "../utils/fs.js";
import { readJsonlFileWithRecovery, writeJsonlRecoveryDiagnostic } from "./jsonlRecovery.js";
import { topicSegmentIdentityKey } from "./topicSegmentIdentity.js";
import { writeTierRecords } from "./tieredStore.js";

interface TopicSegmentRecord {
  schema_version: string;
  conversation_id: string;
  title?: string;
  topic: string;
  raw_topic: string;
  created_at?: string;
  start_index: number;
  end_index: number;
  message_count: number;
  signal_score: number;
  signal_tier: string;
  signal_reasons: string[];
  redaction_count: number;
  redaction_flags: string[];
  text: string;
}

interface ReviewQueueManifest {
  queued_at: string;
  rules_version: string;
  source_collection: string;
  source_file: string;
  destination_file: string;
  candidates_seen: number;
  candidates_queued: number;
  candidates_rejected: number;
  candidates_skipped_as_duplicates: number;
  rejection_reasons: Record<string, number>;
  parse_status?: "clean" | "partial_with_quarantine";
  malformed_lines?: number;
  diagnostic_file?: string;
}

function uniqueByKey(records: TopicSegmentRecord[]): TopicSegmentRecord[] {
  const seen = new Set<string>();
  const output: TopicSegmentRecord[] = [];

  for (const record of records) {
    const key = topicSegmentIdentityKey(record);

    if (seen.has(key)) continue;
    seen.add(key);
    output.push(record);
  }

  return output;
}

function rejectionKey(reason: string, map: Record<string, number>): void {
  map[reason] = (map[reason] ?? 0) + 1;
}

async function main(): Promise<void> {
  const outputRoot = process.argv[2] || "organized_output";
  const dbRoot = path.join(outputRoot, "db");

  const rules = loadReviewQueueRules();

  if (!rules.enabled) {
    console.log("Review queue is disabled by governance rules.");
    process.exit(0);
  }

  const sourceFile = path.join(dbRoot, "tier1_processed", "topic_segments.jsonl");
  const destinationFile = path.join(dbRoot, "tier2_curated", "review_queue.topic_segments.jsonl");

  if (!(await fileExists(sourceFile))) {
    console.error("Processed topic segment file not found:", sourceFile);
    process.exit(1);
  }

  const recovered = await readJsonlFileWithRecovery<TopicSegmentRecord>(sourceFile);
  const sourceRecords = uniqueByKey(recovered.records);
  const diagnosticPath =
    recovered.malformedLines.length > 0
      ? await writeJsonlRecoveryDiagnostic(
          dbRoot,
          "review-queue-jsonl-recovery",
          sourceFile,
          recovered.malformedLines
        )
      : undefined;

  const queued: TopicSegmentRecord[] = [];
  const rejectionReasons: Record<string, number> = {};

  for (const record of sourceRecords) {
    if (!rules.allowed_signal_tiers.includes(record.signal_tier)) {
      rejectionKey("signal_tier_not_allowed", rejectionReasons);
      continue;
    }

    if (rules.exclude_private_review && record.signal_tier === "private_review") {
      rejectionKey("private_review_excluded", rejectionReasons);
      continue;
    }

    if (rules.excluded_topics.map(x => x.toLowerCase()).includes(record.topic.toLowerCase())) {
      rejectionKey("topic_excluded", rejectionReasons);
      continue;
    }

    if (record.signal_score < rules.minimum_signal_score) {
      rejectionKey("signal_score_too_low", rejectionReasons);
      continue;
    }

    if (record.signal_score > rules.maximum_signal_score) {
      rejectionKey("signal_score_too_high", rejectionReasons);
      continue;
    }

    if (record.redaction_count > rules.max_redaction_count) {
      rejectionKey("redaction_count_too_high", rejectionReasons);
      continue;
    }

    if (!record.text.trim()) {
      rejectionKey("empty_text", rejectionReasons);
      continue;
    }

    queued.push(record);
  }

  const uniqueQueued = uniqueByKey(queued);
  const dbWrite = await writeTierRecords(dbRoot, "tier2_curated", "review_queue.topic_segments", uniqueQueued);

  const manifest: ReviewQueueManifest = {
    queued_at: new Date().toISOString(),
    rules_version: rules.version,
    source_collection: "topic_segments",
    source_file: sourceFile,
    destination_file: destinationFile,
    candidates_seen: sourceRecords.length,
    candidates_queued: dbWrite.recordsWritten,
    candidates_rejected: sourceRecords.length - uniqueQueued.length,
    candidates_skipped_as_duplicates: dbWrite.recordsSkipped,
    rejection_reasons: rejectionReasons,
    parse_status: recovered.malformedLines.length > 0 ? "partial_with_quarantine" : "clean",
    malformed_lines: recovered.malformedLines.length || undefined,
    diagnostic_file: diagnosticPath
  };

  const manifestName = "review-queue-" + new Date().toISOString().replace(/[:.]/g, "-") + ".json";
  const manifestPath = path.join(dbRoot, "manifests", manifestName);

  await ensureDir(path.dirname(manifestPath));
  await writeTextFile(manifestPath, JSON.stringify(manifest, null, 2));

  const latestPath = path.join(dbRoot, "manifests", "latest-review-queue.json");
  await writeTextFile(latestPath, JSON.stringify(manifest, null, 2));

  console.log("Review queue build complete.");
  console.log({
    sourceFile,
    destinationFile,
    candidatesSeen: manifest.candidates_seen,
    candidatesQueued: manifest.candidates_queued,
    candidatesRejected: manifest.candidates_rejected,
    candidatesSkippedAsDuplicates: manifest.candidates_skipped_as_duplicates,
    malformedLines: recovered.malformedLines.length,
    diagnosticPath,
    manifestPath
  });
}

main().catch((error) => {
  console.error("Review queue build failed:", error);
  process.exit(1);
});
