import path from "node:path";
import { loadReviewDecisionRules } from "../governance/loadRules.js";
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

interface ReviewDecisionManifest {
  decided_at: string;
  decision: "approve" | "reject";
  rules_version: string;
  source_file: string;
  target_file?: string;
  queue_key: string;
  matched_records: number;
  promoted_written?: number;
  promoted_skipped?: number;
  rejection_reason?: string;
  operator_reason: string;
}

function parseJsonlLines(raw: string): TopicSegmentRecord[] {
  return raw
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => JSON.parse(line) as TopicSegmentRecord);
}

function recordKey(record: TopicSegmentRecord): string {
  return [
    record.conversation_id,
    record.topic,
    record.start_index,
    record.end_index
  ].join("|");
}

async function overwriteJsonl(filePath: string, records: TopicSegmentRecord[]): Promise<void> {
  await ensureDir(path.dirname(filePath));
  const content = records.map(r => JSON.stringify(r)).join("\n");
  await writeTextFile(filePath, content ? content + "\n" : "");
}

async function appendJsonl(filePath: string, records: unknown[]): Promise<void> {
  await ensureDir(path.dirname(filePath));

  let existing = "";
  if (await fileExists(filePath)) {
    const fs = await import("node:fs/promises");
    existing = await fs.readFile(filePath, "utf-8");
  }

  const newLines = records.map(r => JSON.stringify(r)).join("\n");
  const content =
    existing +
    (existing && !existing.endsWith("\n") ? "\n" : "") +
    newLines +
    (newLines ? "\n" : "");

  await writeTextFile(filePath, content);
}

async function main(): Promise<void> {
  const outputRoot = process.argv[2] || "organized_output";
  const decision = process.argv[3] as "approve" | "reject" | undefined;
  const queueKey = process.argv[4];
  const operatorReason = process.argv.slice(5).join(" ").trim();

  const rules = loadReviewDecisionRules();

  if (!decision || !["approve", "reject"].includes(decision)) {
    console.error("Usage: npm run db:review:decide -- <outputRoot> <approve|reject> <queueKey> <reason>");
    process.exit(1);
  }

  if (rules.require_reason && !operatorReason) {
    console.error("A decision reason is required by governance rules.");
    process.exit(1);
  }

  if (decision === "approve" && !rules.allow_approve) {
    console.error("Approve decisions are disabled by governance rules.");
    process.exit(1);
  }

  if (decision === "reject" && !rules.allow_reject) {
    console.error("Reject decisions are disabled by governance rules.");
    process.exit(1);
  }

  if (!rules.collections["review_queue.topic_segments"]) {
    console.error("Review queue topic segment decisions are disabled by governance rules.");
    process.exit(1);
  }

  const dbRoot = path.join(outputRoot, "db");
  const queueFile = path.join(dbRoot, "tier2_curated", "review_queue.topic_segments.jsonl");

  if (!(await fileExists(queueFile))) {
    console.error("Review queue file not found:", queueFile);
    process.exit(1);
  }

  const fs = await import("node:fs/promises");
  const raw = await fs.readFile(queueFile, "utf-8");
  const queueRecords = parseJsonlLines(raw);

  const matched = queueRecords.filter(r => recordKey(r) === queueKey);
  if (matched.length === 0) {
    console.error("No review queue record matched queueKey:", queueKey);
    process.exit(1);
  }

  const remaining = queueRecords.filter(r => recordKey(r) !== queueKey);

  let manifest: ReviewDecisionManifest;

  if (decision === "approve") {
    const targetFile = path.join(dbRoot, "tier2_curated", "topic_segments.reviewed.jsonl");
    const writeResult = await writeTierRecords(
      dbRoot,
      "tier2_curated",
      "topic_segments.reviewed",
      matched
    );

    manifest = {
      decided_at: new Date().toISOString(),
      decision: "approve",
      rules_version: rules.version,
      source_file: queueFile,
      target_file: targetFile,
      queue_key: queueKey,
      matched_records: matched.length,
      promoted_written: writeResult.recordsWritten,
      promoted_skipped: writeResult.recordsSkipped,
      operator_reason: operatorReason
    };
  } else {
    const rejectedFile = path.join(dbRoot, "tier2_curated", "review_queue.rejected.jsonl");
    await appendJsonl(rejectedFile, matched);

    manifest = {
      decided_at: new Date().toISOString(),
      decision: "reject",
      rules_version: rules.version,
      source_file: queueFile,
      queue_key: queueKey,
      matched_records: matched.length,
      rejection_reason: "manual_reject",
      operator_reason: operatorReason
    };
  }

  await overwriteJsonl(queueFile, remaining);

  const manifestName =
    "review-decision-" + new Date().toISOString().replace(/[:.]/g, "-") + ".json";
  const manifestPath = path.join(dbRoot, "manifests", manifestName);
  const latestPath = path.join(dbRoot, "manifests", "latest-review-decision.json");

  await ensureDir(path.dirname(manifestPath));
  await writeTextFile(manifestPath, JSON.stringify(manifest, null, 2));
  await writeTextFile(latestPath, JSON.stringify(manifest, null, 2));

  console.log("Review decision complete.");
  console.log({
    decision,
    queueKey,
    matchedRecords: matched.length,
    remainingQueueRecords: remaining.length,
    manifestPath
  });
}

main().catch((error) => {
  console.error("Review decision failed:", error);
  process.exit(1);
});
