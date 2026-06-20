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
    supportTier: "mvp_first_class",
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
  "Grok export (MVP first-class) imported: 1 conversation(s), 2 topic segment(s), 1 prompt/response pair(s), 1 attachment blob(s) preserved, 1 referenced blob(s) missing."
);

const geminiConversationMessage = buildConversationImportResultMessage(
  {
    sourceCategory: "conversation",
    detectedKind: "gemini_activity_html",
    detectedLabel: "Gemini My Activity export",
    supportTier: "mvp_compatibility_fallback",
    conversationIds: ["gemini-activity-0001"],
    vendorSources: ["gemini"],
    conversationCount: 1,
    messageCount: 2,
    participantCount: 2,
    attachmentCount: 3,
    sampleTitles: ["Gemini Export Sample"],
    topicHints: ["repo planning"]
  },
  {
    run_id: "run-1b",
    started_at: "2026-06-18T09:00:00.000Z",
    status: "success",
    program_version: "test",
    pipeline_version: "test",
    dataset_version: "test",
    files_processed: 1,
    conversations_found: 1,
    raw_conversations_written: 1,
    raw_conversations_skipped: 0,
    attachments_referenced: 3,
    attachments_archived: 1,
    attachments_missing: 2,
    segments_created: 1,
    segments_purged: 0,
    markdown_primary_written: 1,
    duplicates_skipped: 0,
    backups_written: 0,
    archived_existing: 0,
    dataset_topic_segments: 1,
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
  geminiConversationMessage,
  "Gemini My Activity export (Compatibility fallback) imported through recovery path: 1 conversation(s), 1 topic segment(s), 1 prompt/response pair(s), 1 linked file(s) preserved, 2 linked file(s) missing from export folder."
);

const claudeConversationMessage = buildConversationImportResultMessage(
  {
    sourceCategory: "conversation",
    detectedKind: "generic_conversation",
    detectedLabel: "Claude conversation JSON",
    supportTier: "mvp_compatibility_fallback",
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
  "Claude conversation JSON (Compatibility fallback) imported through recovery path: 1 conversation(s), 3 topic segment(s), 2 prompt/response pair(s), 1 attachment reference(s) detected."
);

assert.equal(
  buildDocumentImportResultMessage({
    sourceCategory: "document",
    sourceKind: "pdf_document",
    supportTier: "experimental_expansion",
    fileExtension: ".pdf",
    sizeBytes: 2048,
    parseStatus: "binary_archived_only",
    textLength: 0
  }),
  "PDF document archived only: saved intact without extracted text, and a source-document dataset record was still written."
);

assert.equal(
  buildDocumentImportResultMessage({
    sourceCategory: "document",
    sourceKind: "text_document",
    supportTier: "experimental_expansion",
    fileExtension: ".txt",
    sizeBytes: 512,
    parseStatus: "text_extracted",
    textLength: 128
  }),
  "Text document imported: archived markdown and source-document dataset record written."
);

console.log("import-result-messages.test.ts passed");
