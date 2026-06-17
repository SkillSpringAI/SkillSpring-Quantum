import path from "node:path";
import { promises as fs } from "node:fs";
import type { Conversation, ConversationAttachment } from "../parser/types.js";
import { ensureDir, fileExists, writeTextFile } from "../utils/fs.js";

export interface GrokAttachmentArchiveSummary {
  source_root: string;
  attachments_referenced: number;
  attachments_archived: number;
  attachments_missing: number;
  manifest_path: string;
  archive_root: string;
}

interface GrokAttachmentManifestRecord {
  attachment_id: string;
  label?: string;
  mime_type?: string;
  archive_path?: string;
  preview_path?: string;
  status: "archived" | "missing";
  conversations: string[];
  messages: string[];
}

export async function archiveGrokConversationAttachments(
  conversations: Conversation[],
  inputFilePath: string,
  outputRoot: string
): Promise<GrokAttachmentArchiveSummary> {
  const sourceRoot = path.dirname(inputFilePath);
  const archiveRoot = path.join(outputRoot, "source_archive", "grok_attachments");
  const manifestPath = path.join(outputRoot, "db", "manifests", "latest-grok-attachment-archive.json");

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

        const ref = references.get(attachment.id)!;
        ref.conversations.add(conversation.id);
        ref.messages.add(message.id || "");
      }
    }
  }

  const manifest: GrokAttachmentManifestRecord[] = [];
  let archived = 0;
  let missing = 0;

  for (const [attachmentId, ref] of references.entries()) {
    const sourceDir = path.join(sourceRoot, attachmentId);
    const contentPath = path.join(sourceDir, "content");
    const previewPath = path.join(sourceDir, "previewdoc");
    const contentExists = await fileExists(contentPath);
    const previewExists = await fileExists(previewPath);

    if (!contentExists && !previewExists) {
      missing += 1;
      const sampleAttachment = findAttachmentById(conversations, attachmentId);
      manifest.push({
        attachment_id: attachmentId,
        label: sampleAttachment?.label,
        status: "missing",
        conversations: [...ref.conversations],
        messages: [...ref.messages].filter(Boolean)
      });
      continue;
    }

    await ensureDir(archiveRoot);

    let archivedContentRelative: string | undefined;
    let archivedPreviewRelative: string | undefined;

    if (contentExists) {
      const inferredExt = await inferFileExtension(contentPath);
      const archivedContentPath = path.join(archiveRoot, attachmentId + inferredExt);
      await fs.copyFile(contentPath, archivedContentPath);
      archivedContentRelative = path.relative(outputRoot, archivedContentPath).replace(/\\/g, "/");
    }

    if (previewExists) {
      const previewExt = await inferFileExtension(previewPath);
      const archivedPreviewPath = path.join(archiveRoot, attachmentId + "_preview" + previewExt);
      await fs.copyFile(previewPath, archivedPreviewPath);
      archivedPreviewRelative = path.relative(outputRoot, archivedPreviewPath).replace(/\\/g, "/");
    }

    const inferredPath = archivedContentRelative || archivedPreviewRelative || "";
    const mimeType = mimeTypeFromExtension(inferredPath);
    const sampleAttachment = findAttachmentById(conversations, attachmentId);
    const displayLabel = buildAttachmentLabel(sampleAttachment?.label, mimeType, attachmentId);

    archived += 1;
    manifest.push({
      attachment_id: attachmentId,
      label: displayLabel,
      mime_type: mimeType,
      archive_path: archivedContentRelative,
      preview_path: archivedPreviewRelative,
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
          attachment.archivePath = archivedContentRelative;
          attachment.previewPath = archivedPreviewRelative;
          attachment.mimeType = mimeType;
        }
      }
    }
  }

  await writeTextFile(manifestPath, JSON.stringify({
    source_root: sourceRoot,
    archive_root: archiveRoot,
    attachments_referenced: references.size,
    attachments_archived: archived,
    attachments_missing: missing,
    records: manifest
  }, null, 2));

  return {
    source_root: sourceRoot,
    attachments_referenced: references.size,
    attachments_archived: archived,
    attachments_missing: missing,
    manifest_path: manifestPath,
    archive_root: archiveRoot
  };
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
      return "text/plain";
    default:
      return undefined;
  }
}

function buildAttachmentLabel(
  existingLabel: string | undefined,
  mimeType: string | undefined,
  attachmentId: string
): string {
  const prefix =
    mimeType === "image/jpeg" || mimeType === "image/png" || mimeType === "image/gif"
      ? "Image"
      : mimeType === "application/pdf"
        ? "PDF"
        : mimeType === "text/plain"
          ? "Text"
          : "Attachment";

  const suffix = existingLabel ? existingLabel.replace(/^Attachment\s*/i, "").trim() : "";
  return suffix ? prefix + " attachment " + suffix : prefix + " attachment " + attachmentId.slice(0, 8);
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
