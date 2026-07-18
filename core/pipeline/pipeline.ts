import { promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { detectAndParseConversationExport } from "../parser/index.js";
import { canStreamChatGptConversationsFromRaw } from "../parser/chatgpt.js";
import { loadIndex, saveIndex } from "../index/indexStore.js";
import { exportDatasets } from "./datasetExporter.js";
import { writeDiagnostics } from "../diagnostics/diagnosticStore.js";
import type { RunDiagnostics } from "../diagnostics/types.js";
import { loadSignalThresholdRules } from "../governance/loadRules.js";
import { ingestRawConversations } from "../db/rawIngest.js";
import { runPipelinePreflight } from "../diagnostics/preflight.js";
import { archiveGrokConversationAttachments } from "./grokAttachmentArchive.js";
import { archiveGeminiConversationAttachments } from "./geminiAttachmentArchive.js";
import {
  summarizeDetectedConversationImport,
  type ConversationImportMetadata
} from "../imports/importMetadata.js";
import { runStreamingChatGptPipeline } from "./streamingChatGptPipeline.js";
import { processConversationSegments } from "./conversationSegmentProcessing.js";
import {
  readConversationImportSource,
  summarizePackageCompanionContext,
  type PackageCompanionContext
} from "./pipelineInput.js";
import programManifest from "../../config/programManifest.json" with { type: "json" };

const PIPELINE_VERSION = programManifest.pipeline_version;
const DATASET_VERSION = programManifest.dataset_version;
const PROGRAM_VERSION = programManifest.program_version;
const SEGMENT_WINDOW_SIZE = 4;
const STREAMING_SHARD_CHECKPOINT_INTERVAL = 10;

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
        index,
        datasetVersion: DATASET_VERSION,
        segmentWindowSize: SEGMENT_WINDOW_SIZE,
        processConversationSegments
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
      const segments = await processConversationSegments({
        conversation,
        outputRoot,
        diagnostics,
        index,
        segmentWindowSize: SEGMENT_WINDOW_SIZE,
        filePath
      });
      allSegments.push(...segments);
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

async function main(): Promise<void> {
  const parsedArgs = parseCliArgs(process.argv);
  const diagnostics = await runConversationPipeline(parsedArgs.filePath, parsedArgs.outputRoot);

  process.exit(diagnostics.status === "success" ? 0 : 1);
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
