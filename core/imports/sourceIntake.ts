import path from "node:path";
import { promises as fs } from "node:fs";
import { detectAndParseConversationExport } from "../parser/index.js";
import { runConversationPipeline } from "../pipeline/pipeline.js";
import { ensureDir, fileExists, writeTextFile } from "../utils/fs.js";
import { safeFileStem } from "../utils/format.js";
import { sha256 } from "../utils/hash.js";
import { redactText } from "../pipeline/redaction.js";
import { writeTierRecords, writeDbManifest } from "../db/tieredStore.js";
import { resolveOutputRoot } from "../utils/paths.js";
import { extractPdfText } from "./pdfText.js";
import { buildDatasetPaths } from "../pipeline/datasetVersioning.js";
import {
  buildImportRunRetrievalSummary,
  classifyConversationSupportTier,
  formatVendorSourceList,
  formatSupportTierLabel,
  readConversationImportMetadata,
  type ImportSupportTier,
  type ConversationImportMetadata,
  type DocumentImportMetadata,
  type ImportFileMetadata,
  type ImportRunRetrievalSummary
} from "./importMetadata.js";
import { writeImportRetrievalIndex } from "./importRetrievalIndex.js";

const TEXT_EXTENSIONS = new Set([
  ".txt",
  ".md",
  ".markdown",
  ".csv",
  ".log"
]);

export type ImportSourceKind =
  | "chatgpt_export"
  | "conversation_json"
  | "gemini_activity_html"
  | "json_document"
  | "text_document"
  | "pdf_document"
  | "unsupported";

export interface ImportSourceEntry {
  path: string;
  kind: ImportSourceKind;
  displayLabel: string;
  supported: boolean;
  supportTier: ImportSupportTier;
  reason: string;
}

export interface ImportSourceVendorSummary {
  vendor: "chatgpt" | "grok" | "claude" | "gemini" | "copilot" | "recovered";
  label: string;
  supportTier: ImportSupportTier;
  detectedFiles: number;
  companionFiles: number;
  recommendation: string;
}

export interface ImportSourceSummary {
  inputPath: string;
  inputType: "missing" | "file" | "folder";
  totalFiles: number;
  supportedFiles: number;
  unsupportedFiles: number;
  countsByKind: Record<ImportSourceKind, number>;
  notes: string[];
  sampleFiles: ImportSourceEntry[];
  vendorSummaries: ImportSourceVendorSummary[];
}

export interface ImportRunFileResult {
  path: string;
  kind: ImportSourceKind;
  status: "imported" | "skipped" | "failed";
  message: string;
  artifacts?: ImportArtifact[];
  metadata?: ImportFileMetadata;
}

export interface ImportArtifact {
  label: string;
  path: string;
}

interface AttachmentManifestSummary {
  attachments_referenced: number;
  attachments_archived: number;
  attachments_missing: number;
}

export interface ImportRunSummary {
  runAt: string;
  inputPath: string;
  outputRoot: string;
  historyPath: string;
  filesDiscovered: number;
  filesImported: number;
  filesFailed: number;
  conversationFilesProcessed: number;
  genericDocumentsProcessed: number;
  pdfFilesArchived: number;
  archivedOnlyFiles: number;
  recoveryPathFiles: number;
  unsupportedFilesSkipped: number;
  artifacts: ImportArtifact[];
  results: ImportRunFileResult[];
  retrievalSummary: ImportRunRetrievalSummary | null;
}

export interface ImportProgressUpdate {
  stage:
    | "inspecting_source"
    | "source_ready"
    | "processing_file"
    | "writing_history"
    | "writing_indexes"
    | "completed";
  message: string;
  percent: number;
  filesDiscovered: number;
  completedFiles: number;
  currentPath?: string;
  currentKind?: ImportSourceKind;
}

interface SourceDocumentRecord {
  schema_version: "source_document.v1";
  source_id: string;
  source_kind: Exclude<ImportSourceKind, "unsupported">;
  imported_at: string;
  file_extension: string;
  file_name_hash: string;
  source_path_hash: string;
  archive_path: string;
  original_size_bytes: number;
  parse_status: "text_extracted" | "binary_archived_only";
  text_length: number;
  redaction_count: number;
  redaction_flags: string[];
  content: string;
  extraction_warnings?: string[];
}

interface RawSourceFileRecord {
  schema_version: "raw_source_file.v1";
  source_id: string;
  source_kind: Exclude<ImportSourceKind, "unsupported">;
  imported_at: string;
  original_path: string;
  file_name: string;
  file_extension: string;
  archive_path: string;
  original_size_bytes: number;
  parse_status: "text_extracted" | "binary_archived_only";
  extraction_warnings?: string[];
}

export async function inspectImportSource(inputPath: string): Promise<ImportSourceSummary> {
  const normalizedPath = inputPath.trim().replace(/^["']|["']$/g, "");
  const countsByKind: Record<ImportSourceKind, number> = {
    chatgpt_export: 0,
    conversation_json: 0,
    gemini_activity_html: 0,
    json_document: 0,
    text_document: 0,
    pdf_document: 0,
    unsupported: 0
  };

  const notes: string[] = [];

  let stat;
  try {
    stat = await fs.stat(normalizedPath);
  } catch {
    return {
      inputPath: normalizedPath,
      inputType: "missing",
      totalFiles: 0,
      supportedFiles: 0,
      unsupportedFiles: 0,
      countsByKind,
      notes: ["Path does not exist."],
      sampleFiles: [],
      vendorSummaries: []
    };
  }

  const resolvedInput = stat.isDirectory()
    ? await resolveDirectoryImportFiles(normalizedPath)
    : { files: [normalizedPath], notes: [] };
  const files = resolvedInput.files;
  const packageCompanionReasons = stat.isDirectory()
    ? await buildVendorPackageCompanionReasons(files)
    : new Map<string, string>();

  const entries: ImportSourceEntry[] = [];

  for (const filePath of files) {
    const entry = await classifyImportFile(filePath, packageCompanionReasons);
    countsByKind[entry.kind] += 1;
    entries.push(entry);
  }

  if (countsByKind.pdf_document > 0) {
    notes.push("PDF files can be archived intact, with local text extraction attempted when available.");
  }

  notes.push(...resolvedInput.notes);

  if (countsByKind.unsupported > 0) {
    notes.push("Unsupported file types will be skipped so the import stays focused on formats Quantum recognizes.");
  }

  if (countsByKind.chatgpt_export > 0) {
    notes.push("Recognized ChatGPT exports will be imported as conversations and turned into archives plus dataset records.");
  }

  if (countsByKind.conversation_json > 0) {
    const firstClassNamedJson = entries.some(
      (entry) =>
        entry.kind === "conversation_json" &&
        entry.supportTier === "mvp_first_class" &&
        (entry.displayLabel === "Claude export" || entry.displayLabel === "Gemini export")
    );
    const fallbackOrGenericJson = entries.some(
      (entry) =>
        entry.kind === "conversation_json" &&
        entry.supportTier !== "mvp_first_class"
    );

    if (firstClassNamedJson && fallbackOrGenericJson) {
      notes.push("Conversation JSON includes both named vendor exports and recovery-style shapes here. Quantum will label which files are first-class versus fallback before you import.");
    } else if (firstClassNamedJson) {
      notes.push("Named vendor conversation JSON exports found here can follow Quantum's strongest import path rather than only a generic recovery route.");
    } else {
      notes.push("Recovered conversation JSON can be imported when its thread structure is recognizable, but this does not always mean first-class vendor support.");
    }
  }

  if (countsByKind.gemini_activity_html > 0) {
    notes.push("Gemini My Activity HTML can be recovered into conversations through a compatibility fallback path when the export structure is intact.");
  }

  if (countsByKind.text_document > 0 || countsByKind.json_document > 0) {
    notes.push("Text and JSON documents can be archived and added to privacy-aware source-document datasets.");
  }

  if (entries.some((entry) => entry.reason.includes("Companion file for"))) {
    notes.push("Some files belong to a recognized vendor export package and will be handled through the main package import instead of imported separately.");
  }

  const supportedFiles = entries.filter((entry) => entry.supported).length;

  return {
    inputPath: normalizedPath,
    inputType: stat.isDirectory() ? "folder" : "file",
    totalFiles: entries.length,
    supportedFiles,
    unsupportedFiles: entries.length - supportedFiles,
    countsByKind,
    notes,
    sampleFiles: sortImportSourceEntriesForDisplay(entries).slice(0, 12),
    vendorSummaries: buildImportSourceVendorSummaries(entries)
  };
}

export async function runImportSource(
  inputPath: string,
  outputRootArg?: string,
  onProgress?: (update: ImportProgressUpdate) => void
): Promise<ImportRunSummary> {
  const outputRoot = resolveOutputRoot(outputRootArg);
  onProgress?.({
    stage: "inspecting_source",
    message: "Checking the selected export path.",
    percent: 5,
    filesDiscovered: 0,
    completedFiles: 0
  });
  const summary = await inspectImportSource(inputPath);

  if (summary.inputType === "missing") {
    throw new Error("Import path not found: " + summary.inputPath);
  }

  const runAt = new Date().toISOString();
  const results: ImportRunFileResult[] = [];
  const artifacts: ImportArtifact[] = [];
  let filesImported = 0;
  let filesFailed = 0;
  let conversationFilesProcessed = 0;
  let genericDocumentsProcessed = 0;
  let pdfFilesArchived = 0;
  let archivedOnlyFiles = 0;
  let recoveryPathFiles = 0;
  let unsupportedFilesSkipped = 0;

  const files = summary.inputType === "folder"
    ? (await resolveDirectoryImportFiles(summary.inputPath)).files
    : [summary.inputPath];
  onProgress?.({
    stage: "source_ready",
    message:
      summary.supportedFiles > 0
        ? `Found ${summary.supportedFiles} supported file(s). Preparing the import now.`
        : "No supported files were found in the selected path.",
    percent: files.length > 0 ? 10 : 100,
    filesDiscovered: files.length,
    completedFiles: 0
  });
  const packageCompanionReasons = summary.inputType === "folder"
    ? await buildVendorPackageCompanionReasons(files)
    : new Map<string, string>();

  for (const [index, filePath] of files.entries()) {
    const entry = await classifyImportFile(filePath, packageCompanionReasons);
    const progressPercent = files.length > 0
      ? Math.min(88, 10 + Math.floor((index / files.length) * 75))
      : 88;
    onProgress?.({
      stage: "processing_file",
      message: `Processing ${index + 1} of ${files.length}: ${path.basename(filePath)}`,
      percent: progressPercent,
      filesDiscovered: files.length,
      completedFiles: index,
      currentPath: filePath,
      currentKind: entry.kind
    });

    if (!entry.supported) {
      unsupportedFilesSkipped += 1;
      results.push({
        path: filePath,
        kind: entry.kind,
        status: "skipped",
        message: "Skipped: " + entry.reason
      });
      continue;
    }

    try {
      if (entry.kind === "chatgpt_export" || entry.kind === "conversation_json" || entry.kind === "gemini_activity_html") {
        const metadata = await readConversationImportMetadata(filePath);
        const diagnostics = await runConversationPipeline(filePath, outputRoot);
        if (diagnostics.status !== "success") {
          filesFailed += 1;
          results.push({
            path: filePath,
            kind: entry.kind,
            status: "failed",
            message: "Import failed before archive and dataset outputs were completed. Check diagnostics for details.",
            metadata: metadata ?? undefined
          });
          continue;
        }

        conversationFilesProcessed += 1;
        filesImported += 1;
        if (metadata?.supportTier === "mvp_compatibility_fallback") {
          recoveryPathFiles += 1;
        }
        const conversationArtifacts = await collectConversationArtifacts(outputRoot, diagnostics);
        artifacts.push(...conversationArtifacts);
        results.push({
          path: filePath,
          kind: entry.kind,
          status: "imported",
          message: buildConversationImportResultMessage(metadata, diagnostics),
          artifacts: conversationArtifacts,
          metadata: metadata ?? undefined
        });
        continue;
      }

      if (entry.kind !== "json_document" && entry.kind !== "text_document" && entry.kind !== "pdf_document") {
        throw new Error("Unsupported generic import kind: " + entry.kind);
      }

      const imported = await importGenericFile(filePath, outputRoot, entry.kind, runAt);
      filesImported += 1;

      if (entry.kind === "pdf_document") {
        pdfFilesArchived += 1;
      } else {
        genericDocumentsProcessed += 1;
      }

      if (imported.metadata.parseStatus === "binary_archived_only") {
        archivedOnlyFiles += 1;
      }

      artifacts.push(...imported.artifacts);
      results.push({
        path: filePath,
        kind: entry.kind,
        status: "imported",
        message: buildDocumentImportResultMessage(imported.metadata),
        artifacts: imported.artifacts,
        metadata: imported.metadata
      });
    } catch (error) {
      filesFailed += 1;
      results.push({
        path: filePath,
        kind: entry.kind,
        status: "failed",
        message: error instanceof Error
          ? "Import failed: " + error.message
          : "Import failed before outputs were completed."
      });
    }
  }

  const retrievalSummary = buildImportRunRetrievalSummary(results);
  onProgress?.({
    stage: "writing_history",
    message: "Writing import history and output manifests.",
    percent: 92,
    filesDiscovered: files.length,
    completedFiles: files.length
  });

  const historyPath = await writeImportRunHistory(outputRoot, runAt, {
    runAt,
    inputPath: summary.inputPath,
    outputRoot,
    filesDiscovered: files.length,
    filesImported,
    filesFailed,
    conversationFilesProcessed,
    genericDocumentsProcessed,
    pdfFilesArchived,
    archivedOnlyFiles,
    recoveryPathFiles,
    unsupportedFilesSkipped,
    artifacts: buildRunArtifacts(outputRoot, artifacts),
    results,
    retrievalSummary
  });

  const result: ImportRunSummary = {
    runAt,
    inputPath: summary.inputPath,
    outputRoot,
    historyPath,
    filesDiscovered: files.length,
    filesImported,
    filesFailed,
    conversationFilesProcessed,
    genericDocumentsProcessed,
    pdfFilesArchived,
    archivedOnlyFiles,
    recoveryPathFiles,
    unsupportedFilesSkipped,
    artifacts: buildRunArtifacts(outputRoot, artifacts),
    results,
    retrievalSummary
  };

  const dbRoot = path.join(outputRoot, "db");
  onProgress?.({
    stage: "writing_indexes",
    message: "Updating retrieval and DB summary indexes.",
    percent: 97,
    filesDiscovered: files.length,
    completedFiles: files.length
  });
  await writeDbManifest(dbRoot, "latest-source-import.json", result);
  await writeImportRetrievalIndex(outputRoot, result);
  onProgress?.({
    stage: "completed",
    message:
      filesImported > 0
        ? `Import complete: ${filesImported} imported, ${filesFailed} failed, ${unsupportedFilesSkipped} skipped.`
        : "Import finished without usable outputs.",
    percent: 100,
    filesDiscovered: files.length,
    completedFiles: files.length
  });

  return result;
}

export function buildConversationImportResultMessage(
  metadata: ConversationImportMetadata | null,
  diagnostics: Awaited<ReturnType<typeof runConversationPipeline>>
): string {
  const label = metadata?.detectedLabel ?? "Conversation import";
  const supportTier = metadata?.supportTier;
  const tierLabel = supportTier ? formatSupportTierLabel(supportTier) : null;
  const details = [
    diagnostics.conversations_found + " conversation(s)",
    diagnostics.dataset_topic_segments + " topic segment(s)",
    diagnostics.dataset_prompt_response_pairs + " prompt/response pair(s)"
  ];

  if (metadata?.attachmentCount) {
    if (metadata.detectedKind === "grok_export" && diagnostics.attachments_referenced > 0) {
      details.push(
        diagnostics.attachments_archived +
          " attachment blob(s) preserved"
      );
      if (diagnostics.attachments_missing > 0) {
        details.push(
          diagnostics.attachments_missing +
            " referenced blob(s) missing"
        );
      }
    } else if (metadata.detectedKind === "gemini_activity_html" && diagnostics.attachments_referenced > 0) {
      details.push(
        diagnostics.attachments_archived +
          " linked file(s) preserved"
      );
      if (diagnostics.attachments_missing > 0) {
        details.push(
          diagnostics.attachments_missing +
            " linked file(s) missing from export folder"
        );
      }
    } else {
      details.push(
        metadata.attachmentCount + " attachment reference(s) detected"
      );
    }
  }

  if (supportTier === "mvp_compatibility_fallback") {
    return (tierLabel ? label + " (" + tierLabel + ")" : label) + " imported through recovery path: " + details.join(", ") + ".";
  }

  return (tierLabel ? label + " (" + tierLabel + ")" : label) + " imported: " + details.join(", ") + ".";
}

export function buildDocumentImportResultMessage(
  metadata: DocumentImportMetadata
): string {
  const documentLabel = formatDocumentKindLabel(metadata.sourceKind);

  if (metadata.sourceKind === "pdf_document") {
    if (metadata.parseStatus === "text_extracted") {
      return (
        documentLabel +
        " imported: archived intact, extracted text was available, and a source-document dataset record was written."
      );
    }

    return (
      documentLabel +
      " archived only: saved intact without extracted text, and a source-document dataset record was still written."
    );
  }

  return (
    documentLabel +
    " imported: archived markdown and source-document dataset record written."
  );
}

function formatDocumentKindLabel(
  sourceKind: DocumentImportMetadata["sourceKind"]
): string {
  switch (sourceKind) {
    case "json_document":
      return "JSON document";
    case "text_document":
      return "Text document";
    case "pdf_document":
      return "PDF document";
    default:
      return "Document";
  }
}

async function importGenericFile(
  filePath: string,
  outputRoot: string,
  kind: Exclude<ImportSourceKind, "chatgpt_export" | "conversation_json" | "gemini_activity_html" | "unsupported">,
  importedAt: string
): Promise<{ artifacts: ImportArtifact[]; metadata: DocumentImportMetadata }> {
  const stat = await fs.stat(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const sourceId = sha256(filePath + "|" + stat.size + "|" + stat.mtimeMs);
  const archiveName = safeFileStem(path.basename(filePath, ext), "document") + "_" + sourceId.slice(0, 8);
  const archiveDir = path.join(outputRoot, "source_archive", kind);
  await ensureDir(archiveDir);

  const dbRoot = path.join(outputRoot, "db");

  if (kind === "pdf_document") {
    const archivePath = path.join(archiveDir, archiveName + ext);
    await fs.copyFile(filePath, archivePath);
    const extraction = await extractPdfText(filePath);
    const redactedExtraction = extraction.ok ? redactText(extraction.text) : null;

    const summaryPath = path.join(archiveDir, archiveName + ".md");
    await writeTextFile(
      summaryPath,
      [
        "---",
        "sourceId: " + sourceId,
        "sourceKind: " + JSON.stringify(kind),
        "originalFileName: " + JSON.stringify(path.basename(filePath)),
        "importedAt: " + JSON.stringify(importedAt),
        "parseStatus: " + JSON.stringify(extraction.ok ? "text_extracted" : "binary_archived_only"),
        "---",
        "",
        "# PDF Archived",
        "",
        extraction.ok
          ? "Text was extracted locally from this PDF."
          : "This PDF was archived intact, but text extraction was not available for this file.",
        "",
        "Archived binary: `" + path.relative(outputRoot, archivePath).replace(/\\/g, "/") + "`",
        extraction.warnings.length > 0
          ? "\n## Extraction Notes\n\n" + extraction.warnings.map((warning) => "- " + warning).join("\n")
          : "",
        extraction.text
          ? "\n## Extracted Text\n\n```text\n" + extraction.text.replace(/```/g, "'''") + "\n```"
          : ""
      ].join("\n")
    );

    await writeSourceRecords(dbRoot, {
      rawRecord: {
        schema_version: "raw_source_file.v1",
        source_id: sourceId,
        source_kind: kind,
        imported_at: importedAt,
        original_path: filePath,
        file_name: path.basename(filePath),
        file_extension: ext,
        archive_path: path.relative(outputRoot, archivePath).replace(/\\/g, "/"),
        original_size_bytes: stat.size,
        parse_status: extraction.ok ? "text_extracted" : "binary_archived_only",
        extraction_warnings: extraction.warnings
      },
      processedRecord: {
        schema_version: "source_document.v1",
        source_id: sourceId,
        source_kind: kind,
        imported_at: importedAt,
        file_extension: ext,
        file_name_hash: sha256(path.basename(filePath)),
        source_path_hash: sha256(filePath),
        archive_path: path.relative(outputRoot, summaryPath).replace(/\\/g, "/"),
        original_size_bytes: stat.size,
        parse_status: extraction.ok ? "text_extracted" : "binary_archived_only",
        text_length: redactedExtraction ? redactedExtraction.text.length : 0,
        redaction_count: redactedExtraction ? redactedExtraction.redactionCount : 0,
        redaction_flags: redactedExtraction ? redactedExtraction.flags : [],
        extraction_warnings: extraction.warnings,
        content: redactedExtraction ? redactedExtraction.text : ""
      }
    });

    return {
      artifacts: [
        { label: "PDF archive", path: archivePath },
        { label: "PDF preview markdown", path: summaryPath },
        { label: "Source documents collection", path: path.join(dbRoot, "tier1_processed", "source_documents.jsonl") }
      ],
      metadata: {
        sourceCategory: "document",
        sourceKind: kind,
        supportTier: "experimental_expansion",
        fileExtension: ext,
        sizeBytes: stat.size,
        parseStatus: extraction.ok ? "text_extracted" : "binary_archived_only",
        textLength: extraction.ok ? extraction.text.length : 0
      }
    };
  }

  if (kind !== "json_document" && kind !== "text_document") {
    throw new Error("Unsupported generic text import kind: " + kind);
  }

  const genericTextKind: "json_document" | "text_document" = kind;
  const rawText = await readGenericTextFile(filePath, genericTextKind);
  const redacted = redactText(rawText);
  const archivePath = path.join(archiveDir, archiveName + ".md");

  await writeTextFile(archivePath, renderGenericArchiveMarkdown({
    sourceId,
    kind: genericTextKind,
    importedAt,
    filePath,
    content: rawText
  }));

  await writeSourceRecords(dbRoot, {
    rawRecord: {
      schema_version: "raw_source_file.v1",
      source_id: sourceId,
      source_kind: kind,
      imported_at: importedAt,
      original_path: filePath,
      file_name: path.basename(filePath),
      file_extension: ext,
      archive_path: path.relative(outputRoot, archivePath).replace(/\\/g, "/"),
      original_size_bytes: stat.size,
      parse_status: "text_extracted"
    },
    processedRecord: {
      schema_version: "source_document.v1",
      source_id: sourceId,
      source_kind: kind,
      imported_at: importedAt,
      file_extension: ext,
      file_name_hash: sha256(path.basename(filePath)),
      source_path_hash: sha256(filePath),
      archive_path: path.relative(outputRoot, archivePath).replace(/\\/g, "/"),
      original_size_bytes: stat.size,
      parse_status: "text_extracted",
      text_length: redacted.text.length,
      redaction_count: redacted.redactionCount,
      redaction_flags: redacted.flags,
      content: redacted.text
    }
  });

  return {
    artifacts: [
      { label: "Archived markdown", path: archivePath },
      { label: "Source documents collection", path: path.join(dbRoot, "tier1_processed", "source_documents.jsonl") }
    ],
      metadata: {
        sourceCategory: "document",
        sourceKind: kind,
        supportTier: "experimental_expansion",
        fileExtension: ext,
        sizeBytes: stat.size,
        parseStatus: "text_extracted",
      textLength: rawText.length
    }
  };
}

async function writeSourceRecords(
  dbRoot: string,
  records: {
    rawRecord: RawSourceFileRecord;
    processedRecord: SourceDocumentRecord;
  }
): Promise<void> {
  await writeTierRecords(dbRoot, "tier0_raw", "source_files", [records.rawRecord]);
  await writeTierRecords(dbRoot, "tier1_processed", "source_documents", [records.processedRecord]);
}

async function writeImportRunHistory(
  outputRoot: string,
  runAt: string,
  summary: Omit<ImportRunSummary, "historyPath">
): Promise<string> {
  const historyDir = path.join(outputRoot, "imports", "history");
  const stamp = runAt.replace(/[:.]/g, "-");
  const historyPath = path.join(historyDir, "import-run-" + stamp + ".json");
  const persistedSummary: ImportRunSummary = {
    ...summary,
    historyPath
  };

  await ensureDir(historyDir);
  await writeTextFile(historyPath, JSON.stringify(persistedSummary, null, 2));
  await writeTextFile(
    path.join(outputRoot, "imports", "latest-import-run.json"),
    JSON.stringify(persistedSummary, null, 2)
  );

  return historyPath;
}

function buildRunArtifacts(outputRoot: string, resultArtifacts: ImportArtifact[]): ImportArtifact[] {
  const merged = [
    { label: "Output root", path: outputRoot },
    { label: "Imports root", path: path.join(outputRoot, "imports") },
    { label: "DB root", path: path.join(outputRoot, "db") },
    ...resultArtifacts
  ];

  return dedupeArtifacts(merged);
}

async function collectConversationArtifacts(
  outputRoot: string,
  diagnostics: Awaited<ReturnType<typeof runConversationPipeline>>
): Promise<ImportArtifact[]> {
  const datasetsRoot = path.join(outputRoot, "datasets");
  const dbRoot = path.join(outputRoot, "db");
  const datasetPaths = buildDatasetPaths(outputRoot, diagnostics.dataset_version);

  const artifacts: ImportArtifact[] = [
    { label: "Output root", path: outputRoot },
    { label: "Latest archive notification", path: path.join(outputRoot, "notifications", "latest-archive-event.json") },
    { label: "Notifications", path: path.join(outputRoot, "notifications") },
    { label: "Diagnostics root", path: path.join(outputRoot, "diagnostics") },
    { label: "Latest diagnostics", path: path.join(outputRoot, "diagnostics", "latest-run.json") },
    { label: "Diagnostics history file", path: path.join(outputRoot, "diagnostics", "history", diagnostics.run_id + ".json") },
    { label: "DB root", path: dbRoot },
    { label: "Raw conversations", path: path.join(dbRoot, "tier0_raw", "conversations.jsonl") },
    { label: "Processed topic segments", path: path.join(dbRoot, "tier1_processed", "topic_segments.jsonl") },
    { label: "Prompt/response pairs", path: path.join(dbRoot, "tier1_processed", "prompt_response_pairs.jsonl") },
    { label: "Micro segments", path: path.join(dbRoot, "tier1_processed", "micro_segments.jsonl") },
    { label: "Latest dataset manifest", path: path.join(dbRoot, "manifests", "latest-dataset-run.json") },
    { label: "Latest raw ingest manifest", path: path.join(dbRoot, "manifests", "latest-raw-ingest.json") },
    { label: "Datasets root", path: datasetsRoot },
    { label: "Current topic segments dataset", path: datasetPaths.currentTopicSegmentsFile },
    { label: "Current prompt/response dataset", path: datasetPaths.currentPromptResponsePairsFile },
    { label: "Current micro segments dataset", path: datasetPaths.currentMicroSegmentsFile }
  ];

  const grokAttachmentManifest = path.join(dbRoot, "manifests", "latest-grok-attachment-archive.json");
  const grokAttachmentSummary = await readAttachmentManifestSummary(grokAttachmentManifest);
  if (grokAttachmentSummary) {
    artifacts.push(
      {
        label:
          "Grok attachment manifest (" +
          grokAttachmentSummary.attachments_archived +
          " archived / " +
          grokAttachmentSummary.attachments_missing +
          " missing)",
        path: grokAttachmentManifest
      },
      {
        label:
          "Grok attachments archive (" +
          grokAttachmentSummary.attachments_archived +
          " of " +
          grokAttachmentSummary.attachments_referenced +
          ")",
        path: path.join(outputRoot, "source_archive", "grok_attachments")
      }
    );
  }

  const geminiAttachmentManifest = path.join(dbRoot, "manifests", "latest-gemini-attachment-archive.json");
  const geminiAttachmentSummary = await readAttachmentManifestSummary(geminiAttachmentManifest);
  if (geminiAttachmentSummary) {
    artifacts.push(
      {
        label:
          "Gemini attachment manifest (" +
          geminiAttachmentSummary.attachments_archived +
          " archived / " +
          geminiAttachmentSummary.attachments_missing +
          " missing)",
        path: geminiAttachmentManifest
      },
      {
        label:
          "Gemini attachments archive (" +
          geminiAttachmentSummary.attachments_archived +
          " of " +
          geminiAttachmentSummary.attachments_referenced +
          ")",
        path: path.join(outputRoot, "source_archive", "gemini_attachments")
      }
    );
  }

  const latestArchiveOutput = await readLatestArchiveOutputFile(outputRoot);
  if (latestArchiveOutput) {
    artifacts.push({ label: "Latest archived markdown", path: latestArchiveOutput });
  }

  return dedupeArtifacts(artifacts);
}

async function readAttachmentManifestSummary(
  manifestPath: string
): Promise<AttachmentManifestSummary | null> {
  if (!(await fileExists(manifestPath))) {
    return null;
  }

  try {
    const raw = await fs.readFile(manifestPath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<AttachmentManifestSummary>;
    if (
      typeof parsed.attachments_referenced === "number" &&
      typeof parsed.attachments_archived === "number" &&
      typeof parsed.attachments_missing === "number"
    ) {
      return {
        attachments_referenced: parsed.attachments_referenced,
        attachments_archived: parsed.attachments_archived,
        attachments_missing: parsed.attachments_missing
      };
    }
  } catch {
    return null;
  }

  return null;
}

async function readLatestArchiveOutputFile(outputRoot: string): Promise<string | null> {
  const latestNotificationPath = path.join(outputRoot, "notifications", "latest-archive-event.json");
  if (!(await fileExists(latestNotificationPath))) {
    return null;
  }

  try {
    const raw = await fs.readFile(latestNotificationPath, "utf-8");
    const parsed = JSON.parse(raw) as { output_file?: string };
    return typeof parsed.output_file === "string" ? parsed.output_file : null;
  } catch {
    return null;
  }
}

function dedupeArtifacts(items: ImportArtifact[]): ImportArtifact[] {
  const seen = new Set<string>();
  const output: ImportArtifact[] = [];

  for (const item of items) {
    const key = item.label + "|" + item.path;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }

  return output;
}

async function readGenericTextFile(
  filePath: string,
  kind: "json_document" | "text_document"
): Promise<string> {
  const raw = await fs.readFile(filePath, "utf-8");

  if (kind === "json_document") {
    try {
      return JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      return raw;
    }
  }

  return raw;
}

function renderGenericArchiveMarkdown(input: {
  sourceId: string;
  kind: "json_document" | "text_document";
  importedAt: string;
  filePath: string;
  content: string;
}): string {
  return [
    "---",
    "sourceId: " + input.sourceId,
    "sourceKind: " + JSON.stringify(input.kind),
    "originalFileName: " + JSON.stringify(path.basename(input.filePath)),
    "originalPath: " + JSON.stringify(input.filePath),
    "importedAt: " + JSON.stringify(input.importedAt),
    "---",
    "",
    "# " + path.basename(input.filePath),
    "",
    "```text",
    input.content.replace(/```/g, "'''"),
    "```",
    ""
  ].join("\n");
}

async function classifyImportFile(
  filePath: string,
  packageCompanionReasons = new Map<string, string>()
): Promise<ImportSourceEntry> {
  const companionReason = packageCompanionReasons.get(filePath);
  if (companionReason) {
    return {
      path: filePath,
      kind: "unsupported",
      displayLabel: "Vendor package companion file",
      supported: false,
      supportTier: "unsupported",
      reason: companionReason
    };
  }

  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".pdf") {
    return {
      path: filePath,
      kind: "pdf_document",
      displayLabel: "PDF document",
      supported: true,
      supportTier: "experimental_expansion",
      reason: "Archive the PDF and attempt local text extraction when available."
    };
  }

  if (TEXT_EXTENSIONS.has(ext)) {
    if (ext === ".csv") {
      try {
        const raw = await fs.readFile(filePath, "utf-8");
        const detected = detectAndParseConversationExport(raw);
        if (detected.kind === "copilot_activity_csv") {
          const vendorSources = uniqueConversationSources(detected);
          const supportTier = classifyConversationSupportTier(detected.kind, vendorSources);
          return {
            path: filePath,
            kind: "conversation_json",
            displayLabel: "Microsoft Copilot activity export",
            supported: true,
            supportTier,
            reason: "Recognized as a Microsoft Copilot activity export and will be imported through Quantum's named Copilot adapter."
          };
        }
      } catch {
        // Fall back to generic text-document handling below.
      }
    }

    return {
      path: filePath,
      kind: "text_document",
      displayLabel: "Text document",
      supported: true,
      supportTier: "experimental_expansion",
      reason: "Archive the text file and add a source-document dataset record."
    };
  }

  if (ext === ".json") {
    try {
      const raw = await fs.readFile(filePath, "utf-8");
      const parsed = JSON.parse(raw);
      const detected = detectAndParseConversationExport(parsed);

      if (detected.kind === "chatgpt_export") {
        return {
          path: filePath,
          kind: "chatgpt_export",
          displayLabel: "ChatGPT export",
          supported: true,
          supportTier: "mvp_first_class",
          reason: "Recognized as a ChatGPT export and will be imported as conversations."
        };
      }

      if (
        detected.kind === "grok_export" ||
        detected.kind === "claude_export" ||
        detected.kind === "gemini_export" ||
        detected.kind === "generic_conversation"
      ) {
        const vendorSources = uniqueConversationSources(detected);
        const supportTier = classifyConversationSupportTier(detected.kind, vendorSources);
        return {
          path: filePath,
          kind: "conversation_json",
          displayLabel: buildConversationImportDisplayLabel(detected.kind, vendorSources),
          supported: true,
          supportTier,
          reason:
            detected.kind === "grok_export"
              ? "Recognized as a Grok export and will be imported as conversations."
              : detected.kind === "claude_export"
                ? "Recognized as a Claude export and will be imported through Quantum's named Claude adapter."
                : detected.kind === "gemini_export"
                  ? "Recognized as a Gemini export and will be imported through Quantum's named Gemini adapter."
                : buildConversationJsonReason(vendorSources, supportTier)
        };
      }

      return {
        path: filePath,
        kind: "json_document",
        displayLabel: "JSON document",
        supported: true,
        supportTier: "experimental_expansion",
        reason: "Archive the JSON file and add a source-document dataset record."
      };
    } catch {
      return {
        path: filePath,
        kind: "text_document",
        displayLabel: "Text document",
        supported: true,
        supportTier: "experimental_expansion",
        reason: "Treat as raw text, archive it, and add a source-document dataset record."
      };
    }
  }

  if (ext === ".html") {
    if (path.basename(filePath).toLowerCase() === "chat.html" && await isChatGptHtmlExportFile(filePath)) {
      return {
        path: filePath,
        kind: "chatgpt_export",
        displayLabel: "ChatGPT export",
        supported: true,
        supportTier: "mvp_first_class",
        reason: "Recognized as a ChatGPT export bundle and will be imported as conversations."
      };
    }

    try {
      const raw = await fs.readFile(filePath, "utf-8");
      const detected = detectAndParseConversationExport(raw);
      if (detected.kind === "gemini_activity_html") {
        return {
          path: filePath,
          kind: "gemini_activity_html",
          displayLabel: "Gemini My Activity export",
          supported: true,
          supportTier: "mvp_compatibility_fallback",
          reason: "Recognized as Gemini My Activity HTML and will be recovered through compatibility fallback parsing."
        };
      }
    } catch {
      // Fall through to unsupported if the file cannot be read.
    }
  }

  return {
    path: filePath,
    kind: "unsupported",
    displayLabel: "Unsupported file",
    supported: false,
    supportTier: "unsupported",
    reason: "Skip this file because it is outside the current recognized import set."
  };
}

function buildConversationImportDisplayLabel(
  detectedKind: "grok_export" | "claude_export" | "gemini_export" | "generic_conversation",
  vendorSources: ConversationImportMetadata["vendorSources"]
): string {
  if (detectedKind === "grok_export") {
    return "Grok export";
  }

  if (detectedKind === "claude_export") {
    return "Claude export";
  }

  if (detectedKind === "gemini_export") {
    return "Gemini export";
  }

  const vendorLabel = vendorSources.length > 0 ? formatVendorSourceList(vendorSources) : "Recovered";
  return vendorLabel + " conversation JSON";
}

function uniqueConversationSources(
  detected: Awaited<ReturnType<typeof detectAndParseConversationExport>>
): ConversationImportMetadata["vendorSources"] {
  return [...new Set(detected.parsed.conversations.map((conversation) => conversation.source))].sort();
}

function buildConversationJsonReason(
  vendorSources: ConversationImportMetadata["vendorSources"],
  supportTier: ImportSupportTier
): string {
  const vendorLabel = vendorSources.length > 0 ? formatVendorSourceList(vendorSources) : "Recovered";

  if (supportTier === "mvp_compatibility_fallback") {
    return vendorLabel + " conversation JSON recovered through compatibility fallback parsing.";
  }

  if (supportTier === "experimental_expansion") {
    return vendorLabel + " conversation JSON recovered through an experimental expansion path.";
  }

  return vendorLabel + " conversation JSON will be imported as conversations.";
}

async function buildVendorPackageCompanionReasons(files: string[]): Promise<Map<string, string>> {
  const reasons = new Map<string, string>();
  const grouped = new Map<string, string[]>();

  for (const filePath of files) {
    const dir = path.dirname(filePath);
    const group = grouped.get(dir) ?? [];
    group.push(filePath);
    grouped.set(dir, group);
  }

  for (const directoryFiles of grouped.values()) {
    const byName = new Map(
      directoryFiles.map((filePath) => [path.basename(filePath).toLowerCase(), filePath] as const)
    );

    const geminiHtmlPath =
      byName.get("myactivity.html") ??
      byName.get("my activity.html");

    if (geminiHtmlPath && await isGeminiActivityHtmlFile(geminiHtmlPath)) {
      for (const filePath of directoryFiles) {
        if (filePath === geminiHtmlPath) continue;
        reasons.set(
          filePath,
          "Companion file for Gemini My Activity export. Quantum preserves linked files through the HTML import when they are referenced, so this file is not imported separately."
        );
      }
      continue;
    }

    const chatGptHtmlPath = byName.get("chat.html");
    if (chatGptHtmlPath && await isChatGptHtmlExportFile(chatGptHtmlPath)) {
      for (const filePath of directoryFiles) {
        if (filePath === chatGptHtmlPath) continue;
        reasons.set(
          filePath,
          "Companion file for ChatGPT export. Quantum uses the exported chat bundle as the main import source, so this file is not imported separately."
        );
      }
      continue;
    }

    const claudeConversationsPath = byName.get("conversations.json");
    const claudeUsersPath = byName.get("users.json");
    if (
      claudeConversationsPath &&
      claudeUsersPath &&
      await isClaudeExportFile(claudeConversationsPath)
    ) {
      reasons.set(
        claudeUsersPath,
        "Companion file for Claude export. Quantum uses the conversations export as the MVP import source, so this metadata file is not imported separately."
      );
    }
  }

  return reasons;
}

async function isGeminiActivityHtmlFile(filePath: string): Promise<boolean> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return detectAndParseConversationExport(raw).kind === "gemini_activity_html";
  } catch {
    return false;
  }
}

async function isClaudeExportFile(filePath: string): Promise<boolean> {
  try {
    const raw = JSON.parse(await fs.readFile(filePath, "utf-8")) as unknown;
    return detectAndParseConversationExport(raw).kind === "claude_export";
  } catch {
    return false;
  }
}

async function isChatGptHtmlExportFile(filePath: string): Promise<boolean> {
  const fileHandle = await fs.open(filePath, "r");
  try {
    const buffer = Buffer.alloc(65536);
    const { bytesRead } = await fileHandle.read(buffer, 0, buffer.length, 0);
    const head = buffer.toString("utf-8", 0, bytesRead);
    return head.includes("ChatGPT Data Export") && head.includes("var jsonData =");
  } catch {
    return false;
  } finally {
    await fileHandle.close();
  }
}

function sortImportSourceEntriesForDisplay(entries: ImportSourceEntry[]): ImportSourceEntry[] {
  return [...entries].sort((left, right) => {
    const priorityDelta = importSourceEntryPriority(left) - importSourceEntryPriority(right);
    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    const supportDelta = supportTierPriority(left.supportTier) - supportTierPriority(right.supportTier);
    if (supportDelta !== 0) {
      return supportDelta;
    }

    return left.path.localeCompare(right.path);
  });
}

function buildImportSourceVendorSummaries(
  entries: ImportSourceEntry[]
): ImportSourceVendorSummary[] {
  const summaries = new Map<
    ImportSourceVendorSummary["vendor"],
    ImportSourceVendorSummary
  >();

  for (const entry of entries) {
    const vendor = inferVendorFromImportEntry(entry);
    if (!vendor) {
      continue;
    }

    const current = summaries.get(vendor) ?? {
      vendor,
      label: formatImportSourceVendorLabel(vendor),
      supportTier: entry.supportTier,
      detectedFiles: 0,
      companionFiles: 0,
      recommendation: ""
    };

    if (entry.supported) {
      current.detectedFiles += 1;
    } else if (isCompanionEntry(entry)) {
      current.companionFiles += 1;
    }

    if (supportTierPriority(entry.supportTier) < supportTierPriority(current.supportTier)) {
      current.supportTier = entry.supportTier;
    }

    summaries.set(vendor, current);
  }

  return [...summaries.values()]
    .map((summary) => ({
      ...summary,
      recommendation: buildVendorRecommendation(summary)
    }))
    .sort((left, right) => {
      const supportDelta = supportTierPriority(left.supportTier) - supportTierPriority(right.supportTier);
      if (supportDelta !== 0) {
        return supportDelta;
      }

      return left.label.localeCompare(right.label);
    });
}

function inferVendorFromImportEntry(
  entry: ImportSourceEntry
): ImportSourceVendorSummary["vendor"] | null {
  if (entry.kind === "chatgpt_export") return "chatgpt";
  if (entry.kind === "gemini_activity_html") return "gemini";

  const text = (entry.displayLabel + " " + entry.reason).toLowerCase();

  if (text.includes("chatgpt")) return "chatgpt";
  if (text.includes("grok")) return "grok";
  if (text.includes("claude")) return "claude";
  if (text.includes("gemini")) return "gemini";
  if (text.includes("copilot")) return "copilot";
  if (entry.kind === "conversation_json" || isCompanionEntry(entry)) {
    const pathText = entry.path.toLowerCase();
    if (pathText.includes("chatgpt")) return "chatgpt";
    if (pathText.includes("grok")) return "grok";
    if (pathText.includes("claude")) return "claude";
    if (pathText.includes("gemini")) return "gemini";
    if (pathText.includes("copilot")) return "copilot";
  }
  if (entry.kind === "conversation_json" && entry.supported) return "recovered";

  return null;
}

function isCompanionEntry(entry: ImportSourceEntry): boolean {
  return !entry.supported && entry.reason.includes("Companion file for");
}

function formatImportSourceVendorLabel(
  vendor: ImportSourceVendorSummary["vendor"]
): string {
  switch (vendor) {
    case "chatgpt":
      return "ChatGPT";
    case "grok":
      return "Grok";
    case "claude":
      return "Claude";
    case "gemini":
      return "Gemini";
    case "copilot":
      return "Microsoft Copilot";
    default:
      return "Recovered conversation JSON";
  }
}

function buildVendorRecommendation(summary: ImportSourceVendorSummary): string {
  const companionNote =
    summary.companionFiles > 0
      ? " " + summary.companionFiles + " companion file(s) will be handled through the main package import automatically."
      : "";

  switch (summary.vendor) {
    case "chatgpt":
    case "grok":
    case "claude":
      return summary.label + " is inside the strongest MVP import path. Import now, then open the readable archive first." + companionNote;
    case "gemini":
      return "Gemini is importable through a recovery path today. Use the My Activity HTML as the main file and verify preserved versus missing linked files after import." + companionNote;
    case "copilot":
      return "Microsoft Copilot is first-class for the proven activity CSV export shape Quantum tests today. Import if this matches that CSV export path, then review archive and dataset output normally." + companionNote;
    default:
      return "Recovered conversation JSON can import when the thread structure is recognizable, but it should be treated as recovery work rather than vendor-complete support." + companionNote;
  }
}

function importSourceEntryPriority(entry: ImportSourceEntry): number {
  if (entry.kind === "chatgpt_export" || entry.kind === "conversation_json" || entry.kind === "gemini_activity_html") {
    return 0;
  }

  if (entry.reason.includes("Companion file for")) {
    return 1;
  }

  if (entry.kind === "json_document" || entry.kind === "text_document" || entry.kind === "pdf_document") {
    return 2;
  }

  return 3;
}

function supportTierPriority(tier: ImportSupportTier): number {
  switch (tier) {
    case "mvp_first_class":
      return 0;
    case "mvp_compatibility_fallback":
      return 1;
    case "experimental_expansion":
      return 2;
    default:
      return 3;
  }
}

async function listFilesRecursive(root: string): Promise<string[]> {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(root, entry.name);

    if (entry.isDirectory()) {
      files.push(...await listFilesRecursive(entryPath));
      continue;
    }

    if (entry.isFile()) {
      files.push(entryPath);
    }
  }

  return files.sort();
}

async function resolveDirectoryImportFiles(
  root: string
): Promise<{ files: string[]; notes: string[] }> {
  const topLevelEntries = await fs.readdir(root, { withFileTypes: true });
  const topLevelFiles = topLevelEntries
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(root, entry.name))
    .sort();

  const chatGptHtmlPath = topLevelFiles.find(
    (filePath) => path.basename(filePath).toLowerCase() === "chat.html"
  );

  if (chatGptHtmlPath && await isChatGptHtmlExportFile(chatGptHtmlPath)) {
    const companionNames = new Set([
      "message_feedback.json",
      "shared_conversations.json",
      "user_settings.json",
      "user.json"
    ]);
    const files = topLevelFiles.filter(
      (filePath) =>
        filePath === chatGptHtmlPath ||
        companionNames.has(path.basename(filePath).toLowerCase())
    );

    return {
      files,
      notes: [
        "Large ChatGPT export bundle detected. Quantum will inspect the exported chat bundle directly instead of flooding review with every package attachment file."
      ]
    };
  }

  return {
    files: await listFilesRecursive(root),
    notes: []
  };
}
