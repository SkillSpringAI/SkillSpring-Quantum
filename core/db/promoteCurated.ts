import path from "node:path";
import { loadCurationRules } from "../governance/loadRules.js";
import { ensureDir, fileExists, writeTextFile } from "../utils/fs.js";
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

interface PromotionManifest {
  promoted_at: string;
  rules_version: string;
  source_collection: string;
  source_file: string;
  destination_file: string;
  candidates_seen: number;
  candidates_promoted: number;
  candidates_rejected: number;
  candidates_skipped_as_duplicates: number;
  rejection_reasons: Record<string, number>;
}

function parseJsonlLines(raw: string): TopicSegmentRecord[] {
  return raw
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => JSON.parse(line) as TopicSegmentRecord);
}

function uniqueByKey(records: TopicSegmentRecord[]): TopicSegmentRecord[] {
  const seen = new Set<string>();
  const output: TopicSegmentRecord[] = [];

  for (const record of records) {
    const key = [
      record.conversation_id,
      record.topic,
      record.start_index,
      record.end_index,
      record.text
    ].join("||");

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

  const rules = loadCurationRules();

  if (!rules.collections.topic_segments) {
    console.log("Topic segment promotion is disabled by curation rules.");
    process.exit(0);
  }

  const sourceFile = path.join(dbRoot, "tier1_processed", "topic_segments.jsonl");
  const destinationFile = path.join(dbRoot, "tier2_curated", "topic_segments.promoted.jsonl");

  if (!(await fileExists(sourceFile))) {
    console.error("Processed topic segment file not found:", sourceFile);
    process.exit(1);
  }

  const fs = await import("node:fs/promises");
  const raw = await fs.readFile(sourceFile, "utf-8");
  const sourceRecords = uniqueByKey(parseJsonlLines(raw));

  const promoted: TopicSegmentRecord[] = [];
  const rejectionReasons: Record<string, number> = {};

  for (const record of sourceRecords) {
    if (!rules.allowed_signal_tiers.includes(record.signal_tier)) {
      rejectionKey("signal_tier_not_allowed", rejectionReasons);
      continue;
    }

    if (!rules.allow_private_review && record.signal_tier === "private_review") {
      rejectionKey("private_review_not_allowed", rejectionReasons);
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

    if (rules.require_nonempty_text && !record.text.trim()) {
      rejectionKey("empty_text", rejectionReasons);
      continue;
    }

    if (record.redaction_count > rules.max_redaction_count) {
      rejectionKey("redaction_count_too_high", rejectionReasons);
      continue;
    }

    promoted.push(record);
  }

  const uniquePromoted = uniqueByKey(promoted);
  const dbWrite = await writeTierRecords(dbRoot, "tier2_curated", "topic_segments.promoted", uniquePromoted);

  const manifest: PromotionManifest = {
    promoted_at: new Date().toISOString(),
    rules_version: rules.version,
    source_collection: "topic_segments",
    source_file: sourceFile,
    destination_file: destinationFile,
    candidates_seen: sourceRecords.length,
    candidates_promoted: dbWrite.recordsWritten,
    candidates_rejected: sourceRecords.length - uniquePromoted.length,
    candidates_skipped_as_duplicates: dbWrite.recordsSkipped,
    rejection_reasons: rejectionReasons
  };

  const manifestName = "curation-promotion-" + new Date().toISOString().replace(/[:.]/g, "-") + ".json";
  const manifestPath = path.join(dbRoot, "manifests", manifestName);

  await ensureDir(path.dirname(manifestPath));
  await writeTextFile(manifestPath, JSON.stringify(manifest, null, 2));

  const latestPath = path.join(dbRoot, "manifests", "latest-curation-promotion.json");
  await writeTextFile(latestPath, JSON.stringify(manifest, null, 2));

  console.log("Curated promotion complete.");
  console.log({
    sourceFile,
    destinationFile,
    candidatesSeen: manifest.candidates_seen,
    candidatesPromoted: manifest.candidates_promoted,
    candidatesRejected: manifest.candidates_rejected,
    candidatesSkippedAsDuplicates: manifest.candidates_skipped_as_duplicates,
    manifestPath
  });
}

main().catch((error) => {
  console.error("Curated promotion failed:", error);
  process.exit(1);
});
