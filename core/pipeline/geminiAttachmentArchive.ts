import path from "node:path";
import { promises as fs } from "node:fs";
import type { Conversation, ConversationAttachment } from "../parser/types.js";
import { safeFileStem } from "../utils/format.js";
import { sha256 } from "../utils/hash.js";
import { ensureDir, fileExists, writeTextFile } from "../utils/fs.js";

export interface GeminiAttachmentArchiveSummary {
  source_root: string;
  attachments_referenced: number;
  attachments_archived: number;
  attachments_missing: number;
  manifest_path: string;
  archive_root: string;
}

interface GeminiAttachmentManifestRecord {
  attachment_id: string;
  source_path: string;
  label?: string;
  mime_type?: string;
  archive_path?: string;
  status: "archived" | "missing";
  conversations: string[];
  messages: string[];
}

export async function archiveGeminiConversationAttachments(
  conversations: Conversation[],
  inputFilePath: string,
  outputRoot: string
): Promise<GeminiAttachmentArchiveSummary> {
  const sourceRoot = path.dirname(inputFilePath);
  const archiveRoot = path.join(outputRoot, "source_archive", "gemini_attachments");
  const manifestPath = path.join(outputRoot, "db", "manifests", "latest-gemini-attachment-archive.json");
  const references = collectReferences(conversations);
  const manifest: GeminiAttachmentManifestRecord[] = [];
  let archived = 0;
  let missing = 0;

  for (const [attachmentId, ref] of references.entries()) {
    const sourcePath = resolveGeminiAttachmentPath(sourceRoot, attachmentId);
    const sourceExists = await fileExists(sourcePath);
    const sampleAttachment = findAttachmentById(conversations, attachmentId);

    if (!sourceExists) {
      missing += 1;
      manifest.push({
        attachment_id: attachmentId,
        source_path: sourcePath,
        label: sampleAttachment?.label,
        status: "missing",
        conversations: [...ref.conversations],
        messages: [...ref.messages].filter(Boolean)
      });
      continue;
    }

    await ensureDir(archiveRoot);

    const archiveFileName = await buildArchiveFileName(sourcePath, attachmentId, sampleAttachment?.label);
    const archivedAttachmentPath = path.join(archiveRoot, archiveFileName);
    await fs.copyFile(sourcePath, archivedAttachmentPath);

    const archivedRelativePath = path.relative(outputRoot, archivedAttachmentPath).replace(/\\/g, "/");
    const mimeType = mimeTypeFromExtension(archivedAttachmentPath);
    const displayLabel = buildAttachmentLabel(sampleAttachment?.label, archivedAttachmentPath, attachmentId);

    archived += 1;
    manifest.push({
      attachment_id: attachmentId,
      source_path: sourcePath,
      label: displayLabel,
      mime_type: mimeType,
      archive_path: archivedRelativePath,
      status: "archived",
      conversations: [...ref.conversations],
      messages: [...ref.messages].filter(Boolean)
    });

    for (const conversation of conversations) {
      if (!ref.conversations.has(conversation.id)) continue;
      for (const message of conversation.messages) {
        if (!message.attachments) continue;
        for (const attachment of message.attachments) {
          if (attachment.id !== attachmentId) continue;
          attachment.label = displayLabel;
          attachment.archivePath = archivedRelativePath;
          attachment.previewPath = archivedRelativePath;
          attachment.mimeType = mimeType;
        }
      }
    }
  }

  await writeTextFile(
    manifestPath,
    JSON.stringify(
      {
        source_root: sourceRoot,
        archive_root: archiveRoot,
        attachments_referenced: references.size,
        attachments_archived: archived,
        attachments_missing: missing,
        records: manifest
      },
      null,
      2
    )
  );

  return {
    source_root: sourceRoot,
    attachments_referenced: references.size,
    attachments_archived: archived,
    attachments_missing: missing,
    manifest_path: manifestPath,
    archive_root: archiveRoot
  };
}

function collectReferences(
  conversations: Conversation[]
): Map<string, { conversations: Set<string>; messages: Set<string> }> {
  const references = new Map<string, { conversations: Set<string>; messages: Set<string> }>();

  for (const conversation of conversations) {
    for (const message of conversation.messages) {
      for (const attachment of message.attachments ?? []) {
        if (!references.has(attachment.id)) {
          references.set(attachment.id, {
            conversations: new Set<string>(),
            messages: new Set<string>()
          });
        }

        const reference = references.get(attachment.id)!;
        reference.conversations.add(conversation.id);
        reference.messages.add(message.id || "");
      }
    }
  }

  return references;
}

function resolveGeminiAttachmentPath(sourceRoot: string, attachmentId: string): string {
  const normalized = attachmentId.replace(/\\/g, "/").trim().replace(/^\/+/, "");
  const withoutQuery = normalized.split(/[?#]/, 1)[0];
  const decodedPath = decodeGeminiAttachmentPath(withoutQuery);
  const relativePath = decodedPath.replace(/\//g, path.sep);
  return path.resolve(sourceRoot, relativePath);
}

function decodeGeminiAttachmentPath(value: string): string {
  const trimmed = value.replace(/^[\s\u00a0]+|[\s\u00a0]+$/g, "");
  try {
    return decodeURIComponent(trimmed).replace(/^[\s\u00a0]+|[\s\u00a0]+$/g, "");
  } catch {
    return trimmed;
  }
}

async function buildArchiveFileName(
  sourcePath: string,
  attachmentId: string,
  label?: string
): Promise<string> {
  const ext = await resolveArchiveExtension(sourcePath, attachmentId);
  const sourceName = path.basename(sourcePath, path.extname(sourcePath));
  const baseName = safeFileStem(label || sourceName || "attachment", "attachment");
  return baseName + "_" + sha256(attachmentId).slice(0, 8) + ext;
}

async function resolveArchiveExtension(sourcePath: string, attachmentId: string): Promise<string> {
  const sourceExt = path.extname(sourcePath).toLowerCase();
  if (sourceExt) {
    return sourceExt;
  }

  const hrefExt = path.extname(attachmentId.split(/[?#]/, 1)[0]).toLowerCase();
  if (hrefExt) {
    return hrefExt;
  }

  return inferFileExtension(sourcePath);
}

async function inferFileExtension(filePath: string): Promise<string> {
  const handle = await fs.open(filePath, "r");
  try {
    const buffer = Buffer.alloc(32);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    const head = buffer.subarray(0, bytesRead);
    const text = head.toString("utf8");

    if (head.length >= 4 && head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46) {
      return ".pdf";
    }

    if (head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) {
      return ".jpg";
    }

    if (head.length >= 8 && head[0] === 0x89 && text.includes("PNG")) {
      return ".png";
    }

    if (/^GIF8/.test(text)) {
      return ".gif";
    }

    if (/^\s*</.test(text) || /^[\w\s#*`"'[{(]/.test(text)) {
      return ".txt";
    }

    return ".bin";
  } finally {
    await handle.close();
  }
}

function mimeTypeFromExtension(filePath: string): string | undefined {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".pdf":
      return "application/pdf";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".gif":
      return "image/gif";
    case ".txt":
    case ".md":
      return "text/plain";
    case ".html":
      return "text/html";
    case ".json":
      return "application/json";
    default:
      return undefined;
  }
}

function buildAttachmentLabel(
  existingLabel: string | undefined,
  archivedPath: string,
  attachmentId: string
): string {
  if (existingLabel && existingLabel.trim() !== "") {
    return existingLabel.trim();
  }

  const extension = path.extname(archivedPath).toLowerCase();
  const prefix =
    extension === ".pdf"
      ? "PDF attachment"
      : extension === ".jpg" || extension === ".jpeg" || extension === ".png" || extension === ".gif"
        ? "Image attachment"
        : "Attached file";

  return prefix + " " + attachmentId.slice(0, 8);
}

function findAttachmentById(
  conversations: Conversation[],
  attachmentId: string
): ConversationAttachment | undefined {
  for (const conversation of conversations) {
    for (const message of conversation.messages) {
      for (const attachment of message.attachments ?? []) {
        if (attachment.id === attachmentId) {
          return attachment;
        }
      }
    }
  }

  return undefined;
}
