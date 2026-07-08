import path from "node:path";
import type { Conversation } from "../parser/types.js";
import type { ConversationSegment } from "./segmenter.js";
import type { LocalIndexState } from "../index/state.js";
import { findFingerprintByHash, rememberFingerprint } from "../index/indexStore.js";
import { ensureDir, fileExists, moveFile, writeTextFile } from "../utils/fs.js";
import { datePrefix, monthPrefix, safeFileStem, shortTitle } from "../utils/format.js";
import { renderConversationMarkdown, renderSegmentMarkdown } from "../utils/markdown.js";
import { sha256 } from "../utils/hash.js";

const EXPORT_FOLDER_STEM_MAX = 48;
const EXPORT_FILE_STEM_MAX = 96;

export interface ExportResult {
  outputDir: string;
  outputFile: string;
  status: "primary_written" | "duplicate_skipped" | "backup_written" | "archived_existing" | "purged";
  hash: string;
}

function uniqueFileName(basePath: string): string {
  const ext = path.extname(basePath);
  const stem = basePath.slice(0, -ext.length);
  return stem + "_backup" + ext;
}

function uniqueArchiveName(basePath: string): string {
  const ext = path.extname(basePath);
  const stem = basePath.slice(0, -ext.length);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return stem + "_" + timestamp + ext;
}

async function writeWithDeduplication(
  outputFile: string,
  content: string,
  rootOutputDir: string,
  index: LocalIndexState
): Promise<ExportResult> {
  const hash = sha256(content);
  const existing = findFingerprintByHash(index, hash);

  if (existing) {
    if (existing.backupFile) {
      return {
        outputDir: path.dirname(existing.primaryFile),
        outputFile: existing.primaryFile,
        status: "duplicate_skipped",
        hash
      };
    }

    const backupDir = path.join(rootOutputDir, "backup");
    const backupPath = path.join(
      backupDir,
      path.basename(uniqueFileName(outputFile))
    );

    await ensureDir(path.dirname(backupPath));
    await writeTextFile(backupPath, content);

    existing.backupFile = backupPath;

    return {
      outputDir: path.dirname(backupPath),
      outputFile: backupPath,
      status: "backup_written",
      hash
    };
  }

  let archived = false;

  if (await fileExists(outputFile)) {
    const archiveDir = path.join(rootOutputDir, "archive");
    const archivePath = path.join(
      archiveDir,
      path.basename(uniqueArchiveName(outputFile))
    );

    await moveFile(outputFile, archivePath);
    archived = true;
  }

  await ensureDir(path.dirname(outputFile));
  await writeTextFile(outputFile, content);

  rememberFingerprint(index, {
    hash,
    primaryFile: outputFile
  });

  return {
    outputDir: path.dirname(outputFile),
    outputFile,
    status: archived ? "archived_existing" : "primary_written",
    hash
  };
}

export async function exportConversationMarkdown(
  conversation: Conversation,
  topic: string,
  confidence: number,
  reason: string,
  rootOutputDir = "output",
  index: LocalIndexState
): Promise<ExportResult> {
  const month = monthPrefix(conversation.createdAt);
  const date = datePrefix(conversation.createdAt);

  const folderName = safeFileStem(month + "_" + topic, "general", EXPORT_FOLDER_STEM_MAX);
  const firstUserMessage =
    conversation.messages.find(m => m.role === "user")?.text ||
    conversation.title ||
    "conversation";

  const fileStem = safeFileStem(
    date + "_" + shortTitle(firstUserMessage, 8),
    "conversation",
    EXPORT_FILE_STEM_MAX
  );

  const outputDir = path.join(rootOutputDir, folderName);
  const outputFile = path.join(outputDir, fileStem + ".md");

  const markdown = renderConversationMarkdown(
    conversation,
    topic,
    confidence,
    reason
  );

  return await writeWithDeduplication(outputFile, markdown, rootOutputDir, index);
}

export async function exportSegmentMarkdown(
  segment: ConversationSegment,
  rootOutputDir = "output",
  index: LocalIndexState
): Promise<ExportResult> {
  const month = monthPrefix(segment.createdAt);
  const date = datePrefix(segment.createdAt);

  const folderName = safeFileStem(month + "_" + segment.topic, "general", EXPORT_FOLDER_STEM_MAX);
  const firstUserMessage =
    segment.messages.find(m => m.role === "user")?.text ||
    segment.title ||
    "segment";

  const fileStem = safeFileStem(
    date + "_" + shortTitle(firstUserMessage, 8) + "_part_" + segment.startIndex,
    "segment",
    EXPORT_FILE_STEM_MAX
  );

  const outputDir = path.join(rootOutputDir, folderName);
  const outputFile = path.join(outputDir, fileStem + ".md");
  const markdown = renderSegmentMarkdown(segment);

  return await writeWithDeduplication(outputFile, markdown, rootOutputDir, index);
}

export async function exportPurgedSegmentMarkdown(
  segment: ConversationSegment,
  rootOutputDir = "output"
): Promise<ExportResult> {
  const month = monthPrefix(segment.createdAt);
  const date = datePrefix(segment.createdAt);

  const outputDir = path.join(
    rootOutputDir,
    "purge",
    safeFileStem(month + "_" + segment.topic, "general", EXPORT_FOLDER_STEM_MAX)
  );
  const fileStem = safeFileStem(
    date + "_" + shortTitle(segment.title || "purged_segment", 6) + "_part_" + segment.startIndex,
    "purged_segment",
    EXPORT_FILE_STEM_MAX
  );
  const outputFile = path.join(outputDir, fileStem + ".md");
  const markdown = renderSegmentMarkdown(segment);
  const hash = sha256(markdown);

  await ensureDir(outputDir);
  await writeTextFile(outputFile, markdown);

  return {
    outputDir,
    outputFile,
    status: "purged",
    hash
  };
}
