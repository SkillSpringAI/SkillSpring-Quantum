import { segmentConversation, type ConversationSegment } from "./segmenter.js";
import { exportPurgedSegmentMarkdown, exportSegmentMarkdown } from "./exporter.js";
import {
  rememberAlias,
  rememberProcessedConversationId,
  upsertGroup,
  loadIndex
} from "../index/indexStore.js";
import type { RunDiagnostics } from "../diagnostics/types.js";
import { assessWaste } from "./wasteClassifier.js";
import { recordPurge } from "./purgeStore.js";
import { writeArchiveNotification } from "./archiveNotifier.js";
import type { Conversation } from "../parser/types.js";

export type PipelineIndex = Awaited<ReturnType<typeof loadIndex>>;

export interface ConversationSegmentProcessingArgs {
  conversation: Conversation;
  outputRoot: string;
  diagnostics: RunDiagnostics;
  index: PipelineIndex;
  segmentWindowSize: number;
  filePath?: string;
}

export type ConversationSegmentProcessor = (
  args: ConversationSegmentProcessingArgs
) => Promise<ConversationSegment[]>;

export const processConversationSegments: ConversationSegmentProcessor = async ({
  conversation,
  outputRoot,
  diagnostics,
  index,
  segmentWindowSize,
  filePath
}) => {
  const segments = segmentConversation(conversation, segmentWindowSize, index);

  if (conversation.messages.length >= 4 && segments.length === 0) {
    diagnostics.warnings.push({
      code: "UNEXPECTED_EMPTY_SEGMENTS",
      message: "Conversation had messages but no segments were created",
      file: filePath,
      conversationId: conversation.id
    });
  }

  if (segments.length === 0) {
    return [];
  }

  console.log("Segmented conversation into " + segments.length + " part(s): " + (conversation.title ?? "Untitled"));
  const exportedSegments: ConversationSegment[] = [];

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
};
