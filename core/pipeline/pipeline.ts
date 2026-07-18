import path from "node:path";
import { promises as fs } from "node:fs";
import { pathToFileURL } from "node:url";
import { detectAndParseConversationExport } from "../parser/index.js";
import {
  canStreamChatGptConversationsFromRaw,
  iterateChatGptConversationsFromRaw,
  looksLikeChatGptConversationArrayText
} from "../parser/chatgpt.js";
import { segmentConversation, type ConversationSegment } from "./segmenter.js";
import { exportPurgedSegmentMarkdown, exportSegmentMarkdown } from "./exporter.js";
import {
  loadIndex,
  saveIndex,
  upsertGroup,
  rememberAlias,
  rememberProcessedConversationId
} from "../index/indexStore.js";
import { exportDatasets, type DatasetSummary } from "./datasetExporter.js";
import { buildDatasetPaths } from "./datasetVersioning.js";
import { writeDiagnostics } from "../diagnostics/diagnosticStore.js";
import type { RunDiagnostics } from "../diagnostics/types.js";
import { assessWaste } from "./wasteClassifier.js";
import { recordPurge } from "./purgeStore.js";
import { loadSignalThresholdRules } from "../governance/loadRules.js";
import { ingestRawConversations } from "../db/rawIngest.js";
import { runPipelinePreflight } from "../diagnostics/preflight.js";
import { writeArchiveNotification } from "./archiveNotifier.js";
import { archiveGrokConversationAttachments } from "./grokAttachmentArchive.js";
import { archiveGeminiConversationAttachments } from "./geminiAttachmentArchive.js";
import {
  summarizeDetectedConversationImport,
  type ConversationImportMetadata
} from "../imports/importMetadata.js";
import { fileExists } from "../utils/fs.js";
import { sha256 } from "../utils/hash.js";
import programManifest from "../../config/programManifest.json" with { type: "json" };
import type { Conversation } from "../parser/types.js";

const PIPELINE_VERSION = programManifest.pipeline_version;
const DATASET_VERSION = programManifest.dataset_version;
const PROGRAM_VERSION = programManifest.program_version;
const SEGMENT_WINDOW_SIZE = 4;
const STREAMING_SHARD_CHECKPOINT_INTERVAL = 10;
const STREAMING_DATASET_FLUSH_CONVERSATION_INTERVAL = 25;

interface PackageCompanionContext {
  package_companion_files?: number;
  package_companion_examples?: string[];
}

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

function parseCliArgs(argv: string[]): { filePath?: string; outputRoot: string } {
  const args = argv.slice(2);

  if (args.length === 0) {
    return { filePath: undefined, outputRoot: "organized_output" };
  }

  if (args.length === 1) {
    return { filePath: args[0], outputRoot: "organized_output" };
  }

  return {
    filePath: args.slice(0, -1).join(" ").trim(),
    outputRoot: args[args.length - 1]
  };
}

export async function runConversationPipeline(
  inputFile: string | undefined,
  outputRootArg: string | undefined
): Promise<RunDiagnostics> {
  const startedAt = new Date();
  const signalRules = loadSignalThresholdRules();

  const diagnostics: RunDiagnostics = {
    run_id: "run-" + startedAt.toISOString().replace(/[:.]/g, "-"),
    started_at: startedAt.toISOString(),
    status: "running",
    program_version: PROGRAM_VERSION,
    pipeline_version: PIPELINE_VERSION,
    dataset_version: DATASET_VERSION,
    files_processed: 0,
    conversations_found: 0,
    raw_conversations_written: 0,
    raw_conversations_skipped: 0,
    attachments_referenced: 0,
    attachments_archived: 0,
    attachments_missing: 0,
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
    warnings: [],
    errors: [],
    health_checks: {
      duplicate_rate_warning: false,
      private_review_rate_warning: false,
      low_segment_yield_warning: false,
      purge_rate_warning: false
    },
    settings: {
      segment_window_size: SEGMENT_WINDOW_SIZE,
      output_root: outputRootArg || "organized_output"
    }
  };

  try {
    const preflight = await runPipelinePreflight(inputFile, outputRootArg);

    diagnostics.settings.output_root = preflight.resolved.outputRoot;

    preflight.warnings.forEach((warning) => {
      diagnostics.warnings.push({
        code: "PREFLIGHT_WARNING",
        message: warning
      });
    });

    if (!preflight.ok || !preflight.resolved.inputFile) {
      preflight.errors.forEach((error) => {
        diagnostics.errors.push({
          code: "PREFLIGHT_ERROR",
          message: error
        });
      });

      diagnostics.status = "failed";
      diagnostics.completed_at = new Date().toISOString();
      await writeDiagnostics(preflight.resolved.outputRoot, diagnostics);
      console.error("Preflight failed:", preflight.errors.join(" | "));
      return diagnostics;
    }

    const filePath = preflight.resolved.inputFile;
    const outputRoot = preflight.resolved.outputRoot;

    diagnostics.files_processed = 1;

    const index = await loadIndex(outputRoot);

    const raw = await readConversationImportSource(filePath);
    if (typeof raw === "string" && canStreamChatGptConversationsFromRaw(raw)) {
      return await runStreamingChatGptPipeline({
        raw,
        filePath,
        outputRoot,
        diagnostics,
        index
      });
    }

    const detected = detectAndParseConversationExport(raw);
    const importMetadata = summarizeDetectedConversationImport(detected);
    const packageCompanionContext = await summarizePackageCompanionContext(filePath, detected.kind);
    const parsed = detected.parsed;
    const allSegments = [];

    if (parsed.conversations.length === 0) {
      diagnostics.warnings.push({
        code: "NO_CONVERSATIONS_FOUND",
        message: "No conversations found in file for detected parser: " + detected.label,
        file: filePath
      });

      diagnostics.status = "success";
      diagnostics.completed_at = new Date().toISOString();
      await writeDiagnostics(outputRoot, diagnostics);
      console.warn("No conversations found in file:", filePath);
      return diagnostics;
    }

    diagnostics.conversations_found = parsed.conversations.length;

    if (detected.kind === "grok_export") {
      const attachmentSummary = await archiveGrokConversationAttachments(
        parsed.conversations,
        filePath,
        outputRoot
      );

      diagnostics.attachments_referenced = attachmentSummary.attachments_referenced;
      diagnostics.attachments_archived = attachmentSummary.attachments_archived;
      diagnostics.attachments_missing = attachmentSummary.attachments_missing;

      if (attachmentSummary.attachments_missing > 0) {
        diagnostics.warnings.push({
          code: "GROK_ATTACHMENTS_MISSING",
          message:
            "Some Grok attachment blobs were referenced but not found: " +
            attachmentSummary.attachments_missing
        });
      }
    } else if (detected.kind === "gemini_activity_html") {
      const attachmentSummary = await archiveGeminiConversationAttachments(
        parsed.conversations,
        filePath,
        outputRoot
      );

      diagnostics.attachments_referenced = attachmentSummary.attachments_referenced;
      diagnostics.attachments_archived = attachmentSummary.attachments_archived;
      diagnostics.attachments_missing = attachmentSummary.attachments_missing;

      if (attachmentSummary.attachments_missing > 0) {
        diagnostics.warnings.push({
          code: "GEMINI_ATTACHMENTS_MISSING",
          message:
            "Some Gemini linked files were referenced but not found beside the My Activity HTML: " +
            attachmentSummary.attachments_missing
        });
      }
    }

    const rawIngestSummary = await ingestRawConversations(
      parsed.conversations,
      outputRoot,
      diagnostics.run_id
    );

    diagnostics.raw_conversations_written = rawIngestSummary.raw_conversations_written;
    diagnostics.raw_conversations_skipped = rawIngestSummary.raw_conversations_skipped;

    console.log(
      "Found " +
      parsed.conversations.length +
      " conversation(s) in " +
      path.basename(filePath) +
      " using " +
      detected.label
    );

    for (const conversation of parsed.conversations) {
      const segments = segmentConversation(conversation, SEGMENT_WINDOW_SIZE, index);

      if (conversation.messages.length >= 4 && segments.length === 0) {
        diagnostics.warnings.push({
          code: "UNEXPECTED_EMPTY_SEGMENTS",
          message: "Conversation had messages but no segments were created",
          file: filePath,
          conversationId: conversation.id
        });
      }

      if (segments.length === 0) {
        continue;
      }

      console.log("Segmented conversation into " + segments.length + " part(s): " + (conversation.title ?? "Untitled"));

      for (const segment of segments) {
        diagnostics.segments_created += 1;

        const waste = assessWaste(segment);
        if (waste.isWaste) {
          const purged = await exportPurgedSegmentMarkdown(segment, outputRoot);
          await recordPurge(outputRoot, segment, waste.reason, purged.outputFile);

          diagnostics.segments_purged += 1;

          diagnostics.warnings.push({
            code: "SEGMENT_PURGED",
            message: waste.reason,
            conversationId: segment.conversationId
          });

          continue;
        }

        allSegments.push(segment);

        if (!segment.topic || segment.topic.trim() === "") {
          diagnostics.warnings.push({
            code: "EMPTY_TOPIC",
            message: "Segment topic resolved to empty string",
            conversationId: segment.conversationId
          });
        }

        if (segment.rawTopic && segment.topic && segment.rawTopic.toLowerCase() !== segment.topic.toLowerCase()) {
          rememberAlias(index, segment.rawTopic, segment.topic);
        }

        const exported = await exportSegmentMarkdown(segment, outputRoot, index);
        await writeArchiveNotification(outputRoot, segment, exported);

        upsertGroup(
          index,
          segment.topic,
          segment.rawTopic,
          segment.conversationId,
          exported.outputFile
        );

        rememberProcessedConversationId(index, segment.conversationId);

        if (exported.status === "primary_written") {
          diagnostics.markdown_primary_written += 1;
        } else if (exported.status === "duplicate_skipped") {
          diagnostics.duplicates_skipped += 1;
        } else if (exported.status === "backup_written") {
          diagnostics.backups_written += 1;
        } else if (exported.status === "archived_existing") {
          diagnostics.archived_existing += 1;
        }
      }
    }

    const datasetSummary = await exportDatasets(
      allSegments,
      outputRoot,
      DATASET_VERSION,
      {
        pipeline_run_id: diagnostics.run_id,
        source_input_path: filePath,
        detected_kind: importMetadata?.detectedKind ?? detected.kind,
        detected_label: importMetadata?.detectedLabel ?? detected.label,
        support_tier: importMetadata?.supportTier,
        vendor_sources: importMetadata?.vendorSources ?? [],
        conversation_count: importMetadata?.conversationCount ?? parsed.conversations.length,
        message_count: importMetadata?.messageCount,
        attachment_count: importMetadata?.attachmentCount,
        package_companion_files: packageCompanionContext.package_companion_files,
        package_companion_examples: packageCompanionContext.package_companion_examples,
        topic_hints: importMetadata?.topicHints ?? []
      }
    );
    await saveIndex(outputRoot, index);

    diagnostics.dataset_topic_segments = datasetSummary.topic_segments;
    diagnostics.dataset_prompt_response_pairs = datasetSummary.prompt_response_pairs;
    diagnostics.dataset_micro_segments = datasetSummary.micro_segments;
    diagnostics.dataset_private_review_segments = datasetSummary.private_review_segments;

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

    console.log("Dataset export summary:");
    console.log({
      runId: datasetSummary.run_id,
      datasetVersion: datasetSummary.dataset_version,
      topicSegments: datasetSummary.topic_segments,
      promptResponsePairs: datasetSummary.prompt_response_pairs,
      microSegments: datasetSummary.micro_segments,
      privateReviewSegments: datasetSummary.private_review_segments,
      dbWriteStats: datasetSummary.db_write_stats
    });
    return diagnostics;
  } catch (error) {
    diagnostics.status = "failed";
    diagnostics.completed_at = new Date().toISOString();
    diagnostics.errors.push({
      code: "PIPELINE_FAILURE",
      message: error instanceof Error ? error.message : "Unknown pipeline error",
      file: inputFile,
      stack: error instanceof Error ? error.stack : undefined
    });

    await writeDiagnostics(diagnostics.settings.output_root, diagnostics);
    console.error("Pipeline failed:", error);
    return diagnostics;
  }
}

async function runStreamingChatGptPipeline(args: {
  raw: string;
  filePath: string;
  outputRoot: string;
  diagnostics: RunDiagnostics;
  index: Awaited<ReturnType<typeof loadIndex>>;
}): Promise<RunDiagnostics> {
  const { raw, filePath, outputRoot, diagnostics, index } = args;
  const datasetPaths = buildDatasetPaths(outputRoot, DATASET_VERSION, diagnostics.run_id);
  const completedConversationIds = await loadStreamingShardProgress(outputRoot, filePath);
  let newlyCompletedConversations = 0;
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

    const batchSegments = await processConversationSegments(
      conversation,
      outputRoot,
      diagnostics,
      index
    );

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
        DATASET_VERSION,
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
      newlyCompletedConversations += pendingCompletedConversationIds.length;
      pendingCompletedConversationIds.length = 0;
      await saveStreamingShardProgress(outputRoot, filePath, completedConversationIds);
    }

    pendingFlushConversationCount = 0;
  }
}

async function processConversationSegments(
  conversation: Conversation,
  outputRoot: string,
  diagnostics: RunDiagnostics,
  index: Awaited<ReturnType<typeof loadIndex>>
) {
  const segments = segmentConversation(conversation, SEGMENT_WINDOW_SIZE, index);

  if (conversation.messages.length >= 4 && segments.length === 0) {
    diagnostics.warnings.push({
      code: "UNEXPECTED_EMPTY_SEGMENTS",
      message: "Conversation had messages but no segments were created",
      conversationId: conversation.id
    });
  }

  if (segments.length === 0) {
    return [];
  }

  console.log("Segmented conversation into " + segments.length + " part(s): " + (conversation.title ?? "Untitled"));
  const exportedSegments = [];

  for (const segment of segments) {
    diagnostics.segments_created += 1;

    const waste = assessWaste(segment);
    if (waste.isWaste) {
      const purged = await exportPurgedSegmentMarkdown(segment, outputRoot);
      await recordPurge(outputRoot, segment, waste.reason, purged.outputFile);

      diagnostics.segments_purged += 1;
      diagnostics.warnings.push({
        code: "SEGMENT_PURGED",
        message: waste.reason,
        conversationId: segment.conversationId
      });
      continue;
    }

    exportedSegments.push(segment);

    if (!segment.topic || segment.topic.trim() === "") {
      diagnostics.warnings.push({
        code: "EMPTY_TOPIC",
        message: "Segment topic resolved to empty string",
        conversationId: segment.conversationId
      });
    }

    if (segment.rawTopic && segment.topic && segment.rawTopic.toLowerCase() !== segment.topic.toLowerCase()) {
      rememberAlias(index, segment.rawTopic, segment.topic);
    }

    const exported = await exportSegmentMarkdown(segment, outputRoot, index);
    await writeArchiveNotification(outputRoot, segment, exported);

    upsertGroup(
      index,
      segment.topic,
      segment.rawTopic,
      segment.conversationId,
      exported.outputFile
    );

    rememberProcessedConversationId(index, segment.conversationId);

    if (exported.status === "primary_written") {
      diagnostics.markdown_primary_written += 1;
    } else if (exported.status === "duplicate_skipped") {
      diagnostics.duplicates_skipped += 1;
    } else if (exported.status === "backup_written") {
      diagnostics.backups_written += 1;
    } else if (exported.status === "archived_existing") {
      diagnostics.archived_existing += 1;
    }
  }

  return exportedSegments;
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

async function main(): Promise<void> {
  const parsedArgs = parseCliArgs(process.argv);
  const diagnostics = await runConversationPipeline(parsedArgs.filePath, parsedArgs.outputRoot);

  process.exit(diagnostics.status === "success" ? 0 : 1);
}

async function readConversationImportSource(filePath: string): Promise<unknown> {
  const rawText = await fs.readFile(filePath, "utf-8");
  return [".html", ".csv"].includes(path.extname(filePath).toLowerCase()) || looksLikeChatGptConversationArrayText(rawText)
    ? rawText
    : JSON.parse(rawText) as unknown;
}

async function summarizePackageCompanionContext(
  filePath: string,
  detectedKind: string
): Promise<PackageCompanionContext> {
  const directory = path.dirname(filePath);

  if (detectedKind === "gemini_activity_html") {
    try {
      const entries = await fs.readdir(directory, { withFileTypes: true });
      const companionFiles = entries
        .filter((entry) => entry.isFile())
        .map((entry) => entry.name)
        .filter((name) => path.join(directory, name) !== filePath)
        .sort((left, right) => left.localeCompare(right));

      if (companionFiles.length > 0) {
        return {
          package_companion_files: companionFiles.length,
          package_companion_examples: companionFiles.slice(0, 3)
        };
      }
    } catch {
      return {};
    }
  }

  if (detectedKind === "claude_export") {
    const siblingUsersPath = path.join(directory, "users.json");
    const siblingConversationsPath = path.join(directory, "conversations.json");
    const normalizedFilePath = path.normalize(filePath).toLowerCase();

    if (
      normalizedFilePath === path.normalize(siblingConversationsPath).toLowerCase() &&
      await fileExists(siblingUsersPath)
    ) {
      return {
        package_companion_files: 1,
        package_companion_examples: ["users.json"]
      };
    }
  }

  return {};
}

const isDirectRun =
  typeof process.argv[1] === "string" &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  main().catch((error) => {
    console.error("Fatal pipeline bootstrap failure:", error);
    process.exit(1);
  });
}
