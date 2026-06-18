import assert from "node:assert";
import {
  buildConversationImportResultMessage,
  buildDocumentImportResultMessage
} from "../../core/imports/sourceIntake.js";

const grokConversationMessage = buildConversationImportResultMessage(
  {
    sourceCategory: "conversation",
    detectedKind: "grok_export",
    detectedLabel: "Grok export",
    conversationIds: ["grok-conversation-1"],
    vendorSources: ["grok"],
    conversationCount: 1,
    messageCount: 4,
    participantCount: 2,
    attachmentCount: 2,
    sampleTitles: ["Grok Export Sample"],
    topicHints: ["repo direction"]
  },
  {
    run_id: "run-1",
    started_at: "2026-06-18T09:00:00.000Z",
    status: "success",
    program_version: "test",
    pipeline_version: "test",
    dataset_version: "test",
    files_processed: 1,
    conversations_found: 1,
    raw_conversations_written: 1,
    raw_conversations_skipped: 0,
    attachments_referenced: 2,
    attachments_archived: 1,
    attachments_missing: 1,
    segments_created: 1,
    segments_purged: 0,
    markdown_primary_written: 1,
    duplicates_skipped: 0,
    backups_written: 0,
    archived_existing: 0,
    dataset_topic_segments: 2,
    dataset_prompt_response_pairs: 1,
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
      segment_window_size: 4,
      output_root: "organized_output"
    },
    completed_at: "2026-06-18T09:05:00.000Z"
  }
);

assert.equal(
  grokConversationMessage,
  "Grok export processed: 1 conversation(s), 2 topic segment(s), 1 prompt/response pair(s), 1 attachment blob(s) preserved, 1 referenced blob(s) missing."
);

const claudeConversationMessage = buildConversationImportResultMessage(
  {
    sourceCategory: "conversation",
    detectedKind: "generic_conversation",
    detectedLabel: "Claude conversation JSON",
    conversationIds: ["claude-conversation-1"],
    vendorSources: ["claude"],
    conversationCount: 1,
    messageCount: 5,
    participantCount: 2,
    attachmentCount: 1,
    sampleTitles: ["Claude Export Sample"],
    topicHints: ["product roadmap"]
  },
  {
    run_id: "run-2",
    started_at: "2026-06-18T09:00:00.000Z",
    status: "success",
    program_version: "test",
    pipeline_version: "test",
    dataset_version: "test",
    files_processed: 1,
    conversations_found: 1,
    raw_conversations_written: 1,
    raw_conversations_skipped: 0,
    attachments_referenced: 0,
    attachments_archived: 0,
    attachments_missing: 0,
    segments_created: 1,
    segments_purged: 0,
    markdown_primary_written: 1,
    duplicates_skipped: 0,
    backups_written: 0,
    archived_existing: 0,
    dataset_topic_segments: 3,
    dataset_prompt_response_pairs: 2,
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
      segment_window_size: 4,
      output_root: "organized_output"
    },
    completed_at: "2026-06-18T09:05:00.000Z"
  }
);

assert.equal(
  claudeConversationMessage,
  "Claude conversation JSON processed: 1 conversation(s), 3 topic segment(s), 2 prompt/response pair(s), 1 attachment reference(s) detected."
);

assert.equal(
  buildDocumentImportResultMessage({
    sourceCategory: "document",
    sourceKind: "pdf_document",
    fileExtension: ".pdf",
    sizeBytes: 2048,
    parseStatus: "binary_archived_only",
    textLength: 0
  }),
  "PDF document archived intact without extracted text; source-document dataset record still written."
);

assert.equal(
  buildDocumentImportResultMessage({
    sourceCategory: "document",
    sourceKind: "text_document",
    fileExtension: ".txt",
    sizeBytes: 512,
    parseStatus: "text_extracted",
    textLength: 128
  }),
  "Text document archived and source-document dataset record written."
);

console.log("import-result-messages.test.ts passed");
