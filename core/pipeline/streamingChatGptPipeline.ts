import path from "node:path";
import { promises as fs } from "node:fs";
import { iterateChatGptConversationsFromRaw } from "../parser/chatgpt.js";
import type { Conversation } from "../parser/types.js";
import { exportDatasets, type DatasetSummary } from "./datasetExporter.js";
import { buildDatasetPaths } from "./datasetVersioning.js";
import { writeDiagnostics } from "../diagnostics/diagnosticStore.js";
import type { RunDiagnostics } from "../diagnostics/types.js";
import { loadSignalThresholdRules } from "../governance/loadRules.js";
import { loadIndex, saveIndex } from "../index/indexStore.js";
import { ingestRawConversations } from "../db/rawIngest.js";
import { fileExists } from "../utils/fs.js";
import { sha256 } from "../utils/hash.js";
import type { ConversationSegment } from "./segmenter.js";
import type {
  ConversationSegmentProcessor,
  PipelineIndex
} from "./conversationSegmentProcessing.js";

const STREAMING_DATASET_FLUSH_CONVERSATION_INTERVAL = 25;

interface StreamingImportAggregate {
  vendorSources: Set<string>;
  sampleTitles: Set<string>;
  topicHints: Set<string>;
  messageCount: number;
  attachmentCount: number;
}

interface StreamingShardProgress {
  sourcePath: string;
  updatedAt: string;
  completedConversationIds: string[];
}

export async function runStreamingChatGptPipeline(args: {
  raw: string;
  filePath: string;
  outputRoot: string;
  diagnostics: RunDiagnostics;
  index: PipelineIndex;
  datasetVersion: string;
  segmentWindowSize: number;
  processConversationSegments: ConversationSegmentProcessor;
}): Promise<RunDiagnostics> {
  const {
    raw,
    filePath,
    outputRoot,
    diagnostics,
    index,
    datasetVersion,
    segmentWindowSize,
    processConversationSegments
  } = args;
  const datasetPaths = buildDatasetPaths(outputRoot, datasetVersion, diagnostics.run_id);
  const completedConversationIds = await loadStreamingShardProgress(outputRoot, filePath);
  let pendingFlushConversationCount = 0;
  let pendingDatasetSegments: ConversationSegment[] = [];
  const pendingCompletedConversationIds: string[] = [];
  const aggregate: StreamingImportAggregate = {
    vendorSources: new Set<string>(["chatgpt"]),
    sampleTitles: new Set<string>(),
    topicHints: new Set<string>(),
    messageCount: 0,
    attachmentCount: 0
  };
  let datasetSummary: DatasetSummary | null = null;

  for (const conversation of iterateChatGptConversationsFromRaw(raw)) {
    if (completedConversationIds.has(conversation.id)) {
      continue;
    }

    diagnostics.conversations_found += 1;

    const rawIngestSummary = await ingestRawConversations(
      [conversation],
      outputRoot,
      diagnostics.run_id
    );
    diagnostics.raw_conversations_written += rawIngestSummary.raw_conversations_written;
    diagnostics.raw_conversations_skipped += rawIngestSummary.raw_conversations_skipped;

    const batchSegments = await processConversationSegments({
      conversation,
      outputRoot,
      diagnostics,
      index,
      segmentWindowSize
    });

    if (batchSegments.length === 0) {
      aggregateConversation(aggregate, conversation, []);
      pendingCompletedConversationIds.push(conversation.id);
      pendingFlushConversationCount += 1;
      await flushStreamingConversationBatchIfNeeded(false);
      continue;
    }

    aggregateConversation(aggregate, conversation, batchSegments);
    pendingDatasetSegments.push(...batchSegments);
    pendingCompletedConversationIds.push(conversation.id);
    pendingFlushConversationCount += 1;
    await flushStreamingConversationBatchIfNeeded(false);
  }

  await flushStreamingConversationBatchIfNeeded(true);

  if (diagnostics.conversations_found === 0) {
    diagnostics.warnings.push({
      code: "NO_CONVERSATIONS_FOUND",
      message: "No conversations found in file for detected parser: ChatGPT export",
      file: filePath
    });
    diagnostics.status = "success";
    diagnostics.completed_at = new Date().toISOString();
    await writeDiagnostics(outputRoot, diagnostics);
    await clearStreamingShardProgress(outputRoot, filePath);
    return diagnostics;
  }

  await saveIndex(outputRoot, index);

  await finalizeStreamingDatasetSummary({
    datasetSummary,
    diagnostics,
    outputRoot,
    manifestFile: datasetPaths.manifestFile,
    filePath,
    aggregate
  });

  const duplicateRate =
    diagnostics.segments_created > 0
      ? diagnostics.duplicates_skipped / diagnostics.segments_created
      : 0;

  const privateReviewRate =
    diagnostics.dataset_topic_segments > 0
      ? diagnostics.dataset_private_review_segments / diagnostics.dataset_topic_segments
      : 0;

  const segmentYield =
    diagnostics.conversations_found > 0
      ? diagnostics.dataset_topic_segments / diagnostics.conversations_found
      : 0;

  const purgeRate =
    diagnostics.segments_created > 0
      ? diagnostics.segments_purged / diagnostics.segments_created
      : 0;

  const signalRules = loadSignalThresholdRules();
  diagnostics.health_checks.duplicate_rate_warning =
    duplicateRate > signalRules.health_thresholds.duplicate_rate_warning;
  diagnostics.health_checks.private_review_rate_warning =
    privateReviewRate > signalRules.health_thresholds.private_review_rate_warning;
  diagnostics.health_checks.low_segment_yield_warning =
    segmentYield < signalRules.health_thresholds.low_segment_yield_warning;
  diagnostics.health_checks.purge_rate_warning =
    purgeRate > signalRules.health_thresholds.purge_rate_warning;

  diagnostics.status = "success";
  diagnostics.completed_at = new Date().toISOString();
  await writeDiagnostics(outputRoot, diagnostics);
  await clearStreamingShardProgress(outputRoot, filePath);
  return diagnostics;

  async function flushStreamingConversationBatchIfNeeded(force: boolean): Promise<void> {
    if (!force && pendingFlushConversationCount < STREAMING_DATASET_FLUSH_CONVERSATION_INTERVAL) {
      return;
    }

    if (pendingDatasetSegments.length > 0) {
      const batchSummary = await exportDatasets(
        pendingDatasetSegments,
        outputRoot,
        datasetVersion,
        {
          pipeline_run_id: diagnostics.run_id,
          source_input_path: filePath,
          detected_kind: "chatgpt_export",
          detected_label: "ChatGPT export",
          support_tier: "mvp_first_class",
          vendor_sources: ["chatgpt"]
        },
        datasetPaths
      );
      datasetSummary = datasetSummary ? mergeDatasetSummaries(datasetSummary, batchSummary) : batchSummary;
      pendingDatasetSegments = [];
    }

    if (pendingCompletedConversationIds.length > 0) {
      for (const conversationId of pendingCompletedConversationIds) {
        completedConversationIds.add(conversationId);
      }
      pendingCompletedConversationIds.length = 0;
      await saveStreamingShardProgress(outputRoot, filePath, completedConversationIds);
    }

    pendingFlushConversationCount = 0;
  }
}

function aggregateConversation(
  aggregate: StreamingImportAggregate,
  conversation: Conversation,
  segments: ConversationSegment[]
): void {
  if (conversation.title?.trim() && aggregate.sampleTitles.size < 5) {
    aggregate.sampleTitles.add(conversation.title.trim());
  }

  aggregate.vendorSources.add(conversation.source);
  aggregate.messageCount += conversation.messages.length;

  for (const message of conversation.messages) {
    aggregate.attachmentCount += message.attachments?.length ?? 0;
  }

  const hints = segments
    .map((segment) => segment.summaryLabel?.trim() || segment.topic?.trim() || segment.rawTopic?.trim())
    .filter((value): value is string => Boolean(value));

  for (const hint of hints) {
    if (aggregate.topicHints.size >= 6) {
      break;
    }
    aggregate.topicHints.add(hint);
  }
}

async function finalizeStreamingDatasetSummary(args: {
  datasetSummary: DatasetSummary | null;
  diagnostics: RunDiagnostics;
  outputRoot: string;
  manifestFile: string;
  filePath: string;
  aggregate: StreamingImportAggregate;
}): Promise<void> {
  const {
    datasetSummary,
    diagnostics,
    outputRoot,
    manifestFile,
    filePath,
    aggregate
  } = args;

  if (datasetSummary === null) {
    return;
  }

  datasetSummary.source_context = {
    ...datasetSummary.source_context,
    pipeline_run_id: diagnostics.run_id,
    source_input_path: filePath,
    detected_kind: "chatgpt_export",
    detected_label: "ChatGPT export",
    support_tier: "mvp_first_class",
    vendor_sources: ["chatgpt"],
    conversation_count: diagnostics.conversations_found,
    message_count: aggregate.messageCount,
    attachment_count: aggregate.attachmentCount,
    topic_hints: [...aggregate.topicHints].slice(0, 6)
  };
  await writeDatasetSummaryArtifacts(outputRoot, manifestFile, datasetSummary);

  diagnostics.dataset_topic_segments = datasetSummary.topic_segments;
  diagnostics.dataset_prompt_response_pairs = datasetSummary.prompt_response_pairs;
  diagnostics.dataset_micro_segments = datasetSummary.micro_segments;
  diagnostics.dataset_private_review_segments = datasetSummary.private_review_segments;
}

function mergeDatasetSummaries(
  base: DatasetSummary,
  next: DatasetSummary
): DatasetSummary {
  const mergedTopics = { ...base.topics };
  for (const [topic, count] of Object.entries(next.topics)) {
    mergedTopics[topic] = (mergedTopics[topic] ?? 0) + count;
  }

  const mergedTiers = { ...base.tiers };
  for (const [tier, count] of Object.entries(next.tiers)) {
    mergedTiers[tier] = (mergedTiers[tier] ?? 0) + count;
  }

  const mergedRedactions = { ...base.redaction_summary.redaction_types };
  for (const [flag, count] of Object.entries(next.redaction_summary.redaction_types)) {
    mergedRedactions[flag] = (mergedRedactions[flag] ?? 0) + count;
  }

  return {
    ...base,
    source_context: {
      ...base.source_context,
      vendor_sources: [...new Set([...base.source_context.vendor_sources, ...next.source_context.vendor_sources])],
      topic_hints: [...new Set([...base.source_context.topic_hints, ...next.source_context.topic_hints])].slice(0, 6)
    },
    redaction_summary: {
      affected_segments: base.redaction_summary.affected_segments + next.redaction_summary.affected_segments,
      total_redactions: base.redaction_summary.total_redactions + next.redaction_summary.total_redactions,
      redaction_types: mergedRedactions
    },
    topic_segments: base.topic_segments + next.topic_segments,
    prompt_response_pairs: base.prompt_response_pairs + next.prompt_response_pairs,
    micro_segments: base.micro_segments + next.micro_segments,
    private_review_segments: base.private_review_segments + next.private_review_segments,
    filtered_out_segments: base.filtered_out_segments + next.filtered_out_segments,
    topics: mergedTopics,
    tiers: mergedTiers,
    db_write_stats: {
      processed_topic_written: base.db_write_stats.processed_topic_written + next.db_write_stats.processed_topic_written,
      processed_topic_skipped: base.db_write_stats.processed_topic_skipped + next.db_write_stats.processed_topic_skipped,
      processed_pairs_written: base.db_write_stats.processed_pairs_written + next.db_write_stats.processed_pairs_written,
      processed_pairs_skipped: base.db_write_stats.processed_pairs_skipped + next.db_write_stats.processed_pairs_skipped,
      processed_micro_written: base.db_write_stats.processed_micro_written + next.db_write_stats.processed_micro_written,
      processed_micro_skipped: base.db_write_stats.processed_micro_skipped + next.db_write_stats.processed_micro_skipped,
      curated_topic_written: base.db_write_stats.curated_topic_written + next.db_write_stats.curated_topic_written,
      curated_topic_skipped: base.db_write_stats.curated_topic_skipped + next.db_write_stats.curated_topic_skipped,
      private_review_written: base.db_write_stats.private_review_written + next.db_write_stats.private_review_written,
      private_review_skipped: base.db_write_stats.private_review_skipped + next.db_write_stats.private_review_skipped
    }
  };
}

function getStreamingShardProgressPath(outputRoot: string, filePath: string): string {
  return path.join(
    outputRoot,
    "imports",
    "streaming-shard-progress",
    sha256(path.normalize(filePath).toLowerCase()) + ".json"
  );
}

async function loadStreamingShardProgress(outputRoot: string, filePath: string): Promise<Set<string>> {
  const progressPath = getStreamingShardProgressPath(outputRoot, filePath);
  if (!(await fileExists(progressPath))) {
    return new Set();
  }

  try {
    const loaded = JSON.parse(await fs.readFile(progressPath, "utf-8")) as StreamingShardProgress;
    return new Set(loaded.completedConversationIds ?? []);
  } catch {
    return new Set();
  }
}

async function saveStreamingShardProgress(
  outputRoot: string,
  filePath: string,
  completedConversationIds: Set<string>
): Promise<void> {
  const progressPath = getStreamingShardProgressPath(outputRoot, filePath);
  await fs.mkdir(path.dirname(progressPath), { recursive: true });
  await fs.writeFile(
    progressPath,
    JSON.stringify(
      {
        sourcePath: filePath,
        updatedAt: new Date().toISOString(),
        completedConversationIds: [...completedConversationIds]
      } satisfies StreamingShardProgress,
      null,
      2
    )
  );
}

async function clearStreamingShardProgress(outputRoot: string, filePath: string): Promise<void> {
  const progressPath = getStreamingShardProgressPath(outputRoot, filePath);
  if (await fileExists(progressPath)) {
    await fs.rm(progressPath, { force: true });
  }
}

async function writeDatasetSummaryArtifacts(
  outputRoot: string,
  manifestFile: string,
  summary: Awaited<ReturnType<typeof exportDatasets>>
): Promise<void> {
  const dbManifestPath = path.join(outputRoot, "db", "manifests", "latest-dataset-run.json");
  await fs.mkdir(path.dirname(dbManifestPath), { recursive: true });
  await fs.writeFile(dbManifestPath, JSON.stringify({
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
  }, null, 2));
  await fs.mkdir(path.dirname(manifestFile), { recursive: true });
  await fs.writeFile(manifestFile, JSON.stringify(summary, null, 2));
}
