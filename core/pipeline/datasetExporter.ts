import path from "node:path";
import type { ConversationMessage } from "../parser/types.js";
import type { ConversationSegment } from "./segmenter.js";
import { ensureDir, writeTextFile, fileExists } from "../utils/fs.js";
import { redactMessages } from "./redaction.js";
import { assessSegmentSignal, type SignalTier } from "./signalScorer.js";
import { buildDatasetPaths } from "./datasetVersioning.js";
import { shouldIncludeTopic } from "./topicFilter.js";
import { writeTierRecords, writeDbManifest } from "../db/tieredStore.js";
import { formatRelativeTimestamp } from "../utils/time.js";
import { writeSegmentRetrievalIndex, type SegmentRetrievalIndexEntry } from "./segmentRetrievalIndex.js";
import type { ImportSupportTier } from "../imports/importMetadata.js";

export interface DatasetSourceContext {
  pipeline_run_id: string;
  source_input_path?: string;
  detected_kind?: string;
  detected_label?: string;
  support_tier?: ImportSupportTier;
  vendor_sources: string[];
  conversation_count?: number;
  message_count?: number;
  attachment_count?: number;
  package_companion_files?: number;
  package_companion_examples?: string[];
  topic_hints: string[];
}

export interface DatasetRedactionSummary {
  affected_segments: number;
  total_redactions: number;
  redaction_types: Record<string, number>;
}

interface TopicSegmentRecord {
  schema_version: "topic_segment.v1";
  conversation_id: string;
  title?: string;
  topic: string;
  raw_topic: string;
  created_at?: string;
  start_index: number;
  end_index: number;
  start_relative_time?: string;
  end_relative_time?: string;
  message_count: number;
  signal_score: number;
  signal_tier: SignalTier;
  signal_reasons: string[];
  redaction_count: number;
  redaction_flags: string[];
  text: string;
}

interface PromptResponsePairRecord {
  schema_version: "prompt_response_pair.v1";
  conversation_id: string;
  title?: string;
  topic: string;
  created_at?: string;
  signal_tier: SignalTier;
  prompt: string;
  response: string;
  prompt_relative_time?: string;
  response_relative_time?: string;
  prompt_timestamp?: string;
  response_timestamp?: string;
}

interface MicroSegmentRecord {
  schema_version: "micro_segment.v1";
  conversation_id: string;
  title?: string;
  topic: string;
  created_at?: string;
  signal_tier: SignalTier;
  sequence_index: number;
  messages: Array<{
    role: string;
    text: string;
    relative_time?: string;
    timestamp?: string;
  }>;
}

export interface DatasetSummary {
  run_id: string;
  dataset_version: string;
  source_context: DatasetSourceContext;
  redaction_summary: DatasetRedactionSummary;
  topic_segments: number;
  prompt_response_pairs: number;
  micro_segments: number;
  private_review_segments: number;
  filtered_out_segments: number;
  topics: Record<string, number>;
  tiers: Record<string, number>;
  db_write_stats: {
    processed_topic_written: number;
    processed_topic_skipped: number;
    processed_pairs_written: number;
    processed_pairs_skipped: number;
    processed_micro_written: number;
    processed_micro_skipped: number;
    curated_topic_written: number;
    curated_topic_skipped: number;
    private_review_written: number;
    private_review_skipped: number;
  };
}

function segmentText(messages: ConversationMessage[]): string {
  return messages
    .map(m => "[" + m.role + "] " + m.text.trim())
    .filter(Boolean)
    .join("\n\n");
}

function toJsonlLine(value: unknown): string {
  return JSON.stringify(value);
}

async function appendJsonl(filePath: string, lines: string[]): Promise<void> {
  if (lines.length === 0) return;

  await ensureDir(path.dirname(filePath));

  let existing = "";
  if (await fileExists(filePath)) {
    const fs = await import("node:fs/promises");
    existing = await fs.readFile(filePath, "utf-8");
  }

  const content =
    existing +
    (existing && !existing.endsWith("\n") ? "\n" : "") +
    lines.join("\n") +
    "\n";

  await writeTextFile(filePath, content);
}

function chunkMessages(
  messages: ConversationMessage[],
  size = 3
): ConversationMessage[][] {
  const chunks: ConversationMessage[][] = [];
  for (let i = 0; i < messages.length; i += size) {
    chunks.push(messages.slice(i, i + size));
  }
  return chunks;
}

export async function exportDatasets(
  segments: ConversationSegment[],
  rootOutputDir: string,
  version = "v1",
  sourceContext?: Partial<DatasetSourceContext>
): Promise<DatasetSummary> {
  const paths = buildDatasetPaths(rootOutputDir, version);
  const dbRoot = path.join(rootOutputDir, "db");

  const topicSegmentLines: string[] = [];
  const promptResponseLines: string[] = [];
  const microSegmentLines: string[] = [];

  const processedTopicRecords: TopicSegmentRecord[] = [];
  const processedPairRecords: PromptResponsePairRecord[] = [];
  const processedMicroRecords: MicroSegmentRecord[] = [];
  const segmentRetrievalEntries: SegmentRetrievalIndexEntry[] = [];

  const privateReviewTopicRecords: TopicSegmentRecord[] = [];
  const curatedTopicRecords: TopicSegmentRecord[] = [];

  const summary: DatasetSummary = {
    run_id: paths.runId,
    dataset_version: version,
    source_context: {
      pipeline_run_id: sourceContext?.pipeline_run_id ?? paths.runId,
      source_input_path: sourceContext?.source_input_path,
      detected_kind: sourceContext?.detected_kind,
      detected_label: sourceContext?.detected_label,
      support_tier: sourceContext?.support_tier,
      vendor_sources: sourceContext?.vendor_sources ?? [],
      conversation_count: sourceContext?.conversation_count,
      message_count: sourceContext?.message_count,
      attachment_count: sourceContext?.attachment_count,
      package_companion_files: sourceContext?.package_companion_files,
      package_companion_examples: sourceContext?.package_companion_examples ?? [],
      topic_hints: sourceContext?.topic_hints ?? []
    },
    redaction_summary: {
      affected_segments: 0,
      total_redactions: 0,
      redaction_types: {}
    },
    topic_segments: 0,
    prompt_response_pairs: 0,
    micro_segments: 0,
    private_review_segments: 0,
    filtered_out_segments: 0,
    topics: {},
    tiers: {
      high_signal: 0,
      low_signal: 0,
      private_review: 0
    },
    db_write_stats: {
      processed_topic_written: 0,
      processed_topic_skipped: 0,
      processed_pairs_written: 0,
      processed_pairs_skipped: 0,
      processed_micro_written: 0,
      processed_micro_skipped: 0,
      curated_topic_written: 0,
      curated_topic_skipped: 0,
      private_review_written: 0,
      private_review_skipped: 0
    }
  };

  for (const segment of segments) {
    const topicDecision = shouldIncludeTopic(segment.topic);
    if (!topicDecision.allowed) {
      summary.filtered_out_segments += 1;
      continue;
    }

    const redacted = redactMessages(segment.messages);
    const assessment = assessSegmentSignal(segment, redacted.flags, redacted.redactionCount);

    if (redacted.redactionCount > 0) {
      summary.redaction_summary.affected_segments += 1;
      summary.redaction_summary.total_redactions += redacted.redactionCount;
      for (const [flag, count] of Object.entries(redacted.flagCounts)) {
        summary.redaction_summary.redaction_types[flag] =
          (summary.redaction_summary.redaction_types[flag] ?? 0) + count;
      }
    }

    const topicRecord: TopicSegmentRecord = {
      schema_version: "topic_segment.v1",
      conversation_id: segment.conversationId,
      title: segment.title,
      topic: segment.topic,
      raw_topic: segment.rawTopic,
      created_at: segment.createdAt,
      start_index: segment.startIndex,
      end_index: segment.endIndex,
      start_relative_time: formatRelativeTimestamp(segment.createdAt, redacted.messages[0]?.timestamp),
      end_relative_time: formatRelativeTimestamp(segment.createdAt, redacted.messages[redacted.messages.length - 1]?.timestamp),
      message_count: redacted.messages.length,
      signal_score: assessment.score,
      signal_tier: assessment.tier,
      signal_reasons: assessment.reasons,
      redaction_count: redacted.redactionCount,
      redaction_flags: redacted.flags,
      text: segmentText(redacted.messages)
    };

    topicSegmentLines.push(toJsonlLine(topicRecord));
    processedTopicRecords.push(topicRecord);
    segmentRetrievalEntries.push({
      runId: paths.runId,
      conversationId: segment.conversationId,
      source: segment.source,
      title: segment.title,
      topic: segment.topic,
      rawTopic: segment.rawTopic,
      createdAt: segment.createdAt,
      startIndex: segment.startIndex,
      endIndex: segment.endIndex,
      messageCount: redacted.messages.length,
      signalTier: assessment.tier,
      signalScore: assessment.score,
      redactionCount: redacted.redactionCount,
      textPreview: topicRecord.text.slice(0, 280),
      text: topicRecord.text,
      artifactPaths: [],
      searchText: [
        segment.source,
        segment.title ?? "",
        segment.topic,
        segment.rawTopic,
        topicRecord.text
      ]
        .join(" ")
        .toLowerCase()
    });

    summary.topic_segments += 1;
    summary.topics[segment.topic] = (summary.topics[segment.topic] ?? 0) + 1;
    summary.tiers[assessment.tier] = (summary.tiers[assessment.tier] ?? 0) + 1;

    if (assessment.tier === "private_review") {
      summary.private_review_segments += 1;
      privateReviewTopicRecords.push(topicRecord);
    }

    if (assessment.tier === "high_signal") {
      curatedTopicRecords.push(topicRecord);
    }

    for (let i = 0; i < redacted.messages.length - 1; i++) {
      const current = redacted.messages[i];
      const next = redacted.messages[i + 1];

      if (current.role === "user" && next.role === "assistant") {
        const pairRecord: PromptResponsePairRecord = {
          schema_version: "prompt_response_pair.v1",
          conversation_id: segment.conversationId,
          title: segment.title,
          topic: segment.topic,
          created_at: segment.createdAt,
          signal_tier: assessment.tier,
          prompt: current.text,
          response: next.text,
          prompt_relative_time: formatRelativeTimestamp(segment.createdAt, current.timestamp),
          response_relative_time: formatRelativeTimestamp(segment.createdAt, next.timestamp),
          prompt_timestamp: current.timestamp,
          response_timestamp: next.timestamp
        };

        promptResponseLines.push(toJsonlLine(pairRecord));
        processedPairRecords.push(pairRecord);
        summary.prompt_response_pairs += 1;
      }
    }

    const microChunks = chunkMessages(redacted.messages, 3);
    microChunks.forEach((chunk, index) => {
      const microRecord: MicroSegmentRecord = {
        schema_version: "micro_segment.v1",
        conversation_id: segment.conversationId,
        title: segment.title,
        topic: segment.topic,
        created_at: segment.createdAt,
        signal_tier: assessment.tier,
        sequence_index: index,
        messages: chunk.map(m => ({
          role: m.role,
          text: m.text,
          relative_time: formatRelativeTimestamp(segment.createdAt, m.timestamp),
          timestamp: m.timestamp
        }))
      };

      microSegmentLines.push(toJsonlLine(microRecord));
      processedMicroRecords.push(microRecord);
      summary.micro_segments += 1;
    });
  }

  await appendJsonl(paths.topicSegmentsFile, topicSegmentLines);
  await appendJsonl(paths.promptResponsePairsFile, promptResponseLines);
  await appendJsonl(paths.microSegmentsFile, microSegmentLines);

  await appendJsonl(paths.currentTopicSegmentsFile, topicSegmentLines);
  await appendJsonl(paths.currentPromptResponsePairsFile, promptResponseLines);
  await appendJsonl(paths.currentMicroSegmentsFile, microSegmentLines);

  await ensureDir(path.dirname(paths.runTopicSegmentsFile));
  await writeTextFile(paths.runTopicSegmentsFile, topicSegmentLines.join("\n") + (topicSegmentLines.length > 0 ? "\n" : ""));
  await writeTextFile(paths.runPromptResponsePairsFile, promptResponseLines.join("\n") + (promptResponseLines.length > 0 ? "\n" : ""));
  await writeTextFile(paths.runMicroSegmentsFile, microSegmentLines.join("\n") + (microSegmentLines.length > 0 ? "\n" : ""));
  await writeTextFile(
    paths.runPrivateReviewFile,
    privateReviewTopicRecords.map((record) => toJsonlLine(record)).join("\n") + (privateReviewTopicRecords.length > 0 ? "\n" : "")
  );

  const processedTopicWrite = await writeTierRecords(dbRoot, "tier1_processed", "topic_segments", processedTopicRecords);
  const processedPairWrite = await writeTierRecords(dbRoot, "tier1_processed", "prompt_response_pairs", processedPairRecords);
  const processedMicroWrite = await writeTierRecords(dbRoot, "tier1_processed", "micro_segments", processedMicroRecords);
  const curatedWrite = await writeTierRecords(dbRoot, "tier2_curated", "topic_segments", curatedTopicRecords);
  const privateReviewWrite = await writeTierRecords(dbRoot, "tier3_private_review", "topic_segments", privateReviewTopicRecords);

  summary.db_write_stats.processed_topic_written = processedTopicWrite.recordsWritten;
  summary.db_write_stats.processed_topic_skipped = processedTopicWrite.recordsSkipped;
  summary.db_write_stats.processed_pairs_written = processedPairWrite.recordsWritten;
  summary.db_write_stats.processed_pairs_skipped = processedPairWrite.recordsSkipped;
  summary.db_write_stats.processed_micro_written = processedMicroWrite.recordsWritten;
  summary.db_write_stats.processed_micro_skipped = processedMicroWrite.recordsSkipped;
  summary.db_write_stats.curated_topic_written = curatedWrite.recordsWritten;
  summary.db_write_stats.curated_topic_skipped = curatedWrite.recordsSkipped;
  summary.db_write_stats.private_review_written = privateReviewWrite.recordsWritten;
  summary.db_write_stats.private_review_skipped = privateReviewWrite.recordsSkipped;

  await writeDbManifest(dbRoot, "latest-dataset-run.json", {
    run_id: summary.run_id,
    dataset_version: summary.dataset_version,
    source_context: summary.source_context,
    redaction_summary: summary.redaction_summary,
    topic_segments: summary.topic_segments,
    prompt_response_pairs: summary.prompt_response_pairs,
    micro_segments: summary.micro_segments,
    private_review_segments: summary.private_review_segments,
    filtered_out_segments: summary.filtered_out_segments,
    topics: summary.topics,
    tiers: summary.tiers,
    db_write_stats: summary.db_write_stats
  });

  await ensureDir(paths.manifestsDir);
  await writeTextFile(paths.manifestFile, JSON.stringify(summary, null, 2));
  await writeSegmentRetrievalIndex(rootOutputDir, paths.runId, segmentRetrievalEntries);

  return summary;
}
