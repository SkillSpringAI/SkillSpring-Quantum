import path from "node:path";
import { promises as fs } from "node:fs";
import { parseChatGPTExport } from "../parser/index.js";
import { runConversationPipeline } from "../pipeline/pipeline.js";
import { ensureDir, writeTextFile } from "../utils/fs.js";
import { safeFileStem } from "../utils/format.js";
import { sha256 } from "../utils/hash.js";
import { redactText } from "../pipeline/redaction.js";
import { writeTierRecords, writeDbManifest } from "../db/tieredStore.js";
import { resolveOutputRoot } from "../utils/paths.js";
import { extractPdfText } from "./pdfText.js";

const TEXT_EXTENSIONS = new Set([
  ".txt",
  ".md",
  ".markdown",
  ".csv",
  ".log"
]);

export type ImportSourceKind =
  | "chatgpt_export"
  | "json_document"
  | "text_document"
  | "pdf_document"
  | "unsupported";

export interface ImportSourceEntry {
  path: string;
  kind: ImportSourceKind;
  supported: boolean;
  reason: string;
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
}

export interface ImportRunFileResult {
  path: string;
  kind: ImportSourceKind;
  status: "imported" | "skipped" | "failed";
  message: string;
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
  unsupportedFilesSkipped: number;
  results: ImportRunFileResult[];
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
      sampleFiles: []
    };
  }

  const files = stat.isDirectory()
    ? await listFilesRecursive(normalizedPath)
    : [normalizedPath];

  const entries: ImportSourceEntry[] = [];

  for (const filePath of files) {
    const entry = await classifyImportFile(filePath);
    countsByKind[entry.kind] += 1;
    entries.push(entry);
  }

  if (countsByKind.pdf_document > 0) {
    notes.push("PDF files are archived intact and Quantum will attempt local text extraction when possible.");
  }

  if (countsByKind.unsupported > 0) {
    notes.push("Unsupported file types will be skipped during import.");
  }

  if (countsByKind.chatgpt_export > 0) {
    notes.push("ChatGPT export JSON files will run through the conversation pipeline.");
  }

  if (countsByKind.text_document > 0 || countsByKind.json_document > 0) {
    notes.push("Text and generic JSON files will be archived and added to anonymized source document datasets.");
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
    sampleFiles: entries.slice(0, 12)
  };
}

export async function runImportSource(
  inputPath: string,
  outputRootArg?: string
): Promise<ImportRunSummary> {
  const outputRoot = resolveOutputRoot(outputRootArg);
  const summary = await inspectImportSource(inputPath);

  if (summary.inputType === "missing") {
    throw new Error("Import path not found: " + summary.inputPath);
  }

  const runAt = new Date().toISOString();
  const results: ImportRunFileResult[] = [];
  let filesImported = 0;
  let filesFailed = 0;
  let conversationFilesProcessed = 0;
  let genericDocumentsProcessed = 0;
  let pdfFilesArchived = 0;
  let unsupportedFilesSkipped = 0;

  const files = summary.inputType === "folder"
    ? await listFilesRecursive(summary.inputPath)
    : [summary.inputPath];

  for (const filePath of files) {
    const entry = await classifyImportFile(filePath);

    if (!entry.supported) {
      unsupportedFilesSkipped += 1;
      results.push({
        path: filePath,
        kind: entry.kind,
        status: "skipped",
        message: entry.reason
      });
      continue;
    }

    try {
      if (entry.kind === "chatgpt_export") {
        const diagnostics = await runConversationPipeline(filePath, outputRoot);
        if (diagnostics.status !== "success") {
          filesFailed += 1;
          results.push({
            path: filePath,
            kind: entry.kind,
            status: "failed",
            message: "Conversation pipeline failed."
          });
          continue;
        }

        conversationFilesProcessed += 1;
        filesImported += 1;
        results.push({
          path: filePath,
          kind: entry.kind,
          status: "imported",
          message: "Conversation export processed."
        });
        continue;
      }

      if (entry.kind !== "json_document" && entry.kind !== "text_document" && entry.kind !== "pdf_document") {
        throw new Error("Unsupported generic import kind: " + entry.kind);
      }

      await importGenericFile(filePath, outputRoot, entry.kind, runAt);
      filesImported += 1;

      if (entry.kind === "pdf_document") {
        pdfFilesArchived += 1;
      } else {
        genericDocumentsProcessed += 1;
      }

      results.push({
        path: filePath,
        kind: entry.kind,
        status: "imported",
        message:
          entry.kind === "pdf_document"
            ? "PDF archived with metadata."
            : "Generic document archived and dataset record written."
      });
    } catch (error) {
      filesFailed += 1;
      results.push({
        path: filePath,
        kind: entry.kind,
        status: "failed",
        message: error instanceof Error ? error.message : "Import failed."
      });
    }
  }

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
    unsupportedFilesSkipped,
    results
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
    unsupportedFilesSkipped,
    results
  };

  const dbRoot = path.join(outputRoot, "db");
  await writeDbManifest(dbRoot, "latest-source-import.json", result);

  return result;
}

async function importGenericFile(
  filePath: string,
  outputRoot: string,
  kind: Exclude<ImportSourceKind, "chatgpt_export" | "unsupported">,
  importedAt: string
): Promise<void> {
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

    return;
  }

  const rawText = await readGenericTextFile(filePath, kind);
  const redacted = redactText(rawText);
  const archivePath = path.join(archiveDir, archiveName + ".md");

  await writeTextFile(archivePath, renderGenericArchiveMarkdown({
    sourceId,
    kind,
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

async function classifyImportFile(filePath: string): Promise<ImportSourceEntry> {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".pdf") {
    return {
      path: filePath,
      kind: "pdf_document",
      supported: true,
      reason: "PDF will be archived intact with metadata."
    };
  }

  if (TEXT_EXTENSIONS.has(ext)) {
    return {
      path: filePath,
      kind: "text_document",
      supported: true,
      reason: "Text document can be archived and anonymized."
    };
  }

  if (ext === ".json") {
    try {
      const raw = await fs.readFile(filePath, "utf-8");
      const parsed = JSON.parse(raw);
      const conversations = parseChatGPTExport(parsed).conversations;

      if (conversations.length > 0) {
        return {
          path: filePath,
          kind: "chatgpt_export",
          supported: true,
          reason: "ChatGPT export detected."
        };
      }

      return {
        path: filePath,
        kind: "json_document",
        supported: true,
        reason: "Generic JSON document can be archived and anonymized."
      };
    } catch {
      return {
        path: filePath,
        kind: "text_document",
        supported: true,
        reason: "Invalid JSON will be treated as raw text."
      };
    }
  }

  return {
    path: filePath,
    kind: "unsupported",
    supported: false,
    reason: "File type is not supported yet."
  };
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
