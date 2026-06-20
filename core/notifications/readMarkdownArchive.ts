import path from "node:path";
import { promises as fs } from "node:fs";
import { fileExists } from "../utils/fs.js";
import { resolveOutputRoot } from "../utils/paths.js";

interface MarkdownArchiveFile {
  name: string;
  path: string;
  topicFolder: string;
  sizeBytes: number;
  modifiedAt: string;
}

interface MarkdownArchiveTopic {
  name: string;
  path: string;
  fileCount: number;
  files: MarkdownArchiveFile[];
}

interface AttachmentArchiveSummary {
  vendor: "grok" | "gemini";
  attachmentsReferenced: number;
  attachmentsArchived: number;
  attachmentsMissing: number;
  manifestPath: string;
  archiveRoot: string;
}

const SYSTEM_FOLDERS = new Set([
  "archive",
  "backup",
  "current",
  "datasets",
  "db",
  "diagnostics",
  "notifications",
  "purge",
  "restore_queue"
]);

function isTopicFolder(name: string): boolean {
  if (SYSTEM_FOLDERS.has(name)) return false;
  return /^\d{4}-\d{2}_/.test(name);
}

async function listMarkdownFiles(topicPath: string, topicFolder: string): Promise<MarkdownArchiveFile[]> {
  const entries = await fs.readdir(topicPath, { withFileTypes: true });
  const files: MarkdownArchiveFile[] = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".md")) continue;

    const filePath = path.join(topicPath, entry.name);
    const stats = await fs.stat(filePath);

    files.push({
      name: entry.name,
      path: filePath,
      topicFolder,
      sizeBytes: stats.size,
      modifiedAt: stats.mtime.toISOString()
    });
  }

  return files.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
}

async function main(): Promise<void> {
  const outputRoot = resolveOutputRoot(process.argv[2]);
  const requestedFile = process.argv[3];

  if (!(await fileExists(outputRoot))) {
    console.log(JSON.stringify({
      outputRoot,
      topics: [],
      selectedFile: null,
      content: "",
      attachmentSummaries: []
    }, null, 2));
    return;
  }

  const entries = await fs.readdir(outputRoot, { withFileTypes: true });
  const topics: MarkdownArchiveTopic[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || !isTopicFolder(entry.name)) continue;

    const topicPath = path.join(outputRoot, entry.name);
    const files = await listMarkdownFiles(topicPath, entry.name);

    if (files.length === 0) continue;

    topics.push({
      name: entry.name,
      path: topicPath,
      fileCount: files.length,
      files
    });
  }

  topics.sort((a, b) => a.name.localeCompare(b.name));

  let selectedFile: MarkdownArchiveFile | null = null;
  let content = "";
  const attachmentSummaries = await readAttachmentArchiveSummaries(outputRoot);

  if (requestedFile) {
    const allFiles = topics.flatMap(topic => topic.files);
    selectedFile = allFiles.find(file => file.path === requestedFile) ?? null;

    if (selectedFile) {
      content = await fs.readFile(selectedFile.path, "utf-8");
    }
  }

  console.log(JSON.stringify({
    outputRoot,
    topics,
    selectedFile,
    content,
    attachmentSummaries
  }, null, 2));
}

async function readAttachmentArchiveSummaries(outputRoot: string): Promise<AttachmentArchiveSummary[]> {
  const manifests = [
    {
      vendor: "grok" as const,
      manifestPath: path.join(outputRoot, "db", "manifests", "latest-grok-attachment-archive.json")
    },
    {
      vendor: "gemini" as const,
      manifestPath: path.join(outputRoot, "db", "manifests", "latest-gemini-attachment-archive.json")
    }
  ];

  const results: AttachmentArchiveSummary[] = [];

  for (const item of manifests) {
    if (!(await fileExists(item.manifestPath))) {
      continue;
    }

    try {
      const parsed = JSON.parse(await fs.readFile(item.manifestPath, "utf-8")) as {
        archive_root?: string;
        attachments_referenced?: number;
        attachments_archived?: number;
        attachments_missing?: number;
      };

      if (
        typeof parsed.archive_root === "string" &&
        typeof parsed.attachments_referenced === "number" &&
        typeof parsed.attachments_archived === "number" &&
        typeof parsed.attachments_missing === "number"
      ) {
        results.push({
          vendor: item.vendor,
          attachmentsReferenced: parsed.attachments_referenced,
          attachmentsArchived: parsed.attachments_archived,
          attachmentsMissing: parsed.attachments_missing,
          manifestPath: item.manifestPath,
          archiveRoot: parsed.archive_root
        });
      }
    } catch {
      continue;
    }
  }

  return results;
}

main().catch((error) => {
  console.error("Read markdown archive failed:", error);
  process.exit(1);
});
