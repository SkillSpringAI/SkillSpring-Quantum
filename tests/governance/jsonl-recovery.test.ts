import assert from "node:assert";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

async function main(): Promise<void> {
  const workspaceRoot = process.cwd();
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "quantum-jsonl-recovery-"));

  try {
    await verifyReviewQueueRecovery(workspaceRoot, tempRoot);
    await verifyReviewDecisionBlock(workspaceRoot, tempRoot);
    console.log("jsonl-recovery.test.ts passed");
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

async function verifyReviewQueueRecovery(
  workspaceRoot: string,
  tempRoot: string
): Promise<void> {
  const outputRoot = path.join(tempRoot, "queue-recovery");
  const dbRoot = path.join(outputRoot, "db");
  const sourceFile = path.join(dbRoot, "tier1_processed", "topic_segments.jsonl");

  await fs.mkdir(path.dirname(sourceFile), { recursive: true });
  await fs.writeFile(
    sourceFile,
    [
      JSON.stringify(buildTopicSegment("conversation-1", "topic-one", 0, 2, "first valid text")),
      '{"broken": ',
      JSON.stringify(buildTopicSegment("conversation-2", "topic-two", 3, 5, "second valid text"))
    ].join("\n") + "\n",
    "utf-8"
  );

  const run = await runTsx(workspaceRoot, [
    "core/db/buildReviewQueue.ts",
    outputRoot
  ]);

  assert.equal(run.exitCode, 0, `Expected review queue build to recover successfully.\n${run.stderr}`);

  const queueFile = path.join(dbRoot, "tier2_curated", "review_queue.topic_segments.jsonl");
  const queueLines = await readNonEmptyLines(queueFile);
  assert.equal(queueLines.length, 2, "Expected only valid records to reach the review queue");

  const latestManifestPath = path.join(dbRoot, "manifests", "latest-review-queue.json");
  const latestManifest = JSON.parse(await fs.readFile(latestManifestPath, "utf-8")) as {
    parse_status?: string;
    malformed_lines?: number;
    diagnostic_file?: string;
  };

  assert.equal(
    latestManifest.parse_status,
    "partial_with_quarantine",
    "Expected manifest to record partial recovery status"
  );
  assert.equal(latestManifest.malformed_lines, 1, "Expected manifest to count malformed lines");
  assert.ok(latestManifest.diagnostic_file, "Expected manifest to point at a recovery diagnostic");
  assert.ok(
    await fileExists(latestManifest.diagnostic_file ?? ""),
    "Expected recovery diagnostic file to be written"
  );
}

async function verifyReviewDecisionBlock(
  workspaceRoot: string,
  tempRoot: string
): Promise<void> {
  const outputRoot = path.join(tempRoot, "decision-block");
  const dbRoot = path.join(outputRoot, "db");
  const queueFile = path.join(dbRoot, "tier2_curated", "review_queue.topic_segments.jsonl");

  await fs.mkdir(path.dirname(queueFile), { recursive: true });
  await fs.writeFile(
    queueFile,
    [
      JSON.stringify(buildTopicSegment("conversation-3", "topic-three", 0, 1, "queue record")),
      '{"broken": '
    ].join("\n") + "\n",
    "utf-8"
  );

  const queueKey = "unused-for-malformed-queue";
  const run = await runTsx(workspaceRoot, [
    "core/db/reviewDecisions.ts",
    outputRoot,
    "approve",
    queueKey,
    "test approval should block"
  ]);

  assert.equal(run.exitCode, 1, "Expected review decision flow to block on malformed queue JSONL");
  assert.match(
    run.stderr,
    /blocked because the review queue contains malformed JSONL lines/i,
    "Expected stderr to explain why the queue decision was blocked"
  );

  const diagnosticsDir = path.join(dbRoot, "diagnostics");
  const diagnosticFiles = await fs.readdir(diagnosticsDir);
  assert.ok(
    diagnosticFiles.some(name => name.startsWith("review-decision-jsonl-blocked-")),
    "Expected a review decision diagnostic file to be written"
  );
}

function buildTopicSegment(
  conversationId: string,
  topic: string,
  startIndex: number,
  endIndex: number,
  text: string
) {
  return {
    schema_version: "topic-segments/v1",
    conversation_id: conversationId,
    title: topic,
    topic,
    raw_topic: topic,
    created_at: "2026-07-13T00:00:00.000Z",
    start_index: startIndex,
    end_index: endIndex,
    message_count: 2,
    signal_score: 3,
    signal_tier: "high_signal",
    signal_reasons: ["test"],
    redaction_count: 0,
    redaction_flags: [],
    text
  };
}

async function runTsx(workspaceRoot: string, args: string[]): Promise<{
  exitCode: number | null;
  stdout: string;
  stderr: string;
}> {
  const tsxCli = path.join(workspaceRoot, "node_modules", "tsx", "dist", "cli.mjs");

  return await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [tsxCli, ...args], {
      cwd: workspaceRoot,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", chunk => {
      stdout += String(chunk);
    });

    child.stderr.on("data", chunk => {
      stderr += String(chunk);
    });

    child.on("error", reject);
    child.on("close", exitCode => {
      resolve({ exitCode, stdout, stderr });
    });
  });
}

async function readNonEmptyLines(filePath: string): Promise<string[]> {
  const raw = await fs.readFile(filePath, "utf-8");
  return raw.split(/\r?\n/).filter(line => line.trim().length > 0);
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
