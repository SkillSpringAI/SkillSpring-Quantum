import path from "node:path";
import { pathToFileURL } from "node:url";
import { readJsonFile } from "../utils/fs.js";
import { parseChatGPTExport } from "../parser/index.js";
import { segmentConversation } from "./segmenter.js";
import { exportPurgedSegmentMarkdown, exportSegmentMarkdown } from "./exporter.js";
import { loadIndex, saveIndex, upsertGroup, rememberAlias } from "../index/indexStore.js";
import { exportDatasets } from "./datasetExporter.js";
import { writeDiagnostics } from "../diagnostics/diagnosticStore.js";
import type { RunDiagnostics } from "../diagnostics/types.js";
import { assessWaste } from "./wasteClassifier.js";
import { recordPurge } from "./purgeStore.js";
import { loadSignalThresholdRules } from "../governance/loadRules.js";
import { ingestRawConversations } from "../db/rawIngest.js";
import { runPipelinePreflight } from "../diagnostics/preflight.js";
import { writeArchiveNotification } from "./archiveNotifier.js";
import programManifest from "../../config/programManifest.json" with { type: "json" };

const PIPELINE_VERSION = programManifest.pipeline_version;
const DATASET_VERSION = programManifest.dataset_version;
const PROGRAM_VERSION = programManifest.program_version;
const SEGMENT_WINDOW_SIZE = 4;

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

    const raw = await readJsonFile(filePath);
    const parsed = parseChatGPTExport(raw);
    const index = await loadIndex(outputRoot);
    const allSegments = [];

    if (parsed.conversations.length === 0) {
      diagnostics.warnings.push({
        code: "NO_CONVERSATIONS_FOUND",
        message: "No conversations found in file",
        file: filePath
      });

      diagnostics.status = "success";
      diagnostics.completed_at = new Date().toISOString();
      await writeDiagnostics(outputRoot, diagnostics);
      console.warn("No conversations found in file:", filePath);
      return diagnostics;
    }

    diagnostics.conversations_found = parsed.conversations.length;

    const rawIngestSummary = await ingestRawConversations(
      parsed.conversations,
      outputRoot,
      diagnostics.run_id
    );

    diagnostics.raw_conversations_written = rawIngestSummary.raw_conversations_written;
    diagnostics.raw_conversations_skipped = rawIngestSummary.raw_conversations_skipped;

    console.log("Found " + parsed.conversations.length + " conversation(s) in " + path.basename(filePath));

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

        if (!index.processedConversationIds.includes(segment.conversationId)) {
          index.processedConversationIds.push(segment.conversationId);
        }

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

    const datasetSummary = await exportDatasets(allSegments, outputRoot, DATASET_VERSION);
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
