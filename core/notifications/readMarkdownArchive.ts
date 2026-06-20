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
  previewText: string;
  source?: string;
  title?: string;
  createdAt?: string;
  topic?: string;
  rawTopic?: string;
  conversationId?: string;
  startIndex?: number;
  endIndex?: number;
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
    const details = await readMarkdownFileDetails(filePath);

    files.push({
      name: entry.name,
      path: filePath,
      topicFolder,
      sizeBytes: stats.size,
      modifiedAt: stats.mtime.toISOString(),
      previewText: details.previewText,
      source: details.source,
      title: details.title,
      createdAt: details.createdAt,
      topic: details.topic,
      rawTopic: details.rawTopic,
      conversationId: details.conversationId,
      startIndex: details.startIndex,
      endIndex: details.endIndex
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
  const allFiles = topics.flatMap(topic => topic.files);

  if (requestedFile) {
    selectedFile = allFiles.find(file => file.path === requestedFile) ?? null;
  } else {
    selectedFile = allFiles
      .slice()
      .sort((left, right) => right.modifiedAt.localeCompare(left.modifiedAt))[0] ?? null;
  }

  if (selectedFile) {
    content = await fs.readFile(selectedFile.path, "utf-8");
  }

  console.log(JSON.stringify({
    outputRoot,
    topics,
    selectedFile,
    content,
    attachmentSummaries
  }, null, 2));
}

async function readMarkdownFileDetails(filePath: string): Promise<{
  previewText: string;
  source?: string;
  title?: string;
  createdAt?: string;
  topic?: string;
  rawTopic?: string;
  conversationId?: string;
  startIndex?: number;
  endIndex?: number;
}> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const metadata = extractMarkdownFrontmatter(raw);
    return {
      previewText: extractMarkdownPreview(raw),
      source: metadata.source,
      title: metadata.title,
      createdAt: metadata.createdAt,
      topic: metadata.topic,
      rawTopic: metadata.rawTopic,
      conversationId: metadata.conversationId,
      startIndex: metadata.startIndex,
      endIndex: metadata.endIndex
    };
  } catch {
    return { previewText: "" };
  }
}

function extractMarkdownPreview(raw: string): string {
  const withoutFrontmatter = raw.startsWith("---")
    ? raw.replace(/^---[\s\S]*?---\s*/u, "")
    : raw;

  return withoutFrontmatter
    .replace(/^#+\s+/gm, "")
    .replace(/`{3}[\s\S]*?`{3}/g, " ")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/[*_>`~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
}

function extractMarkdownFrontmatter(raw: string): {
  source?: string;
  title?: string;
  createdAt?: string;
  topic?: string;
  rawTopic?: string;
  conversationId?: string;
  startIndex?: number;
  endIndex?: number;
} {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    return {};
  }

  const metadata: {
    source?: string;
    title?: string;
    createdAt?: string;
    topic?: string;
    rawTopic?: string;
    conversationId?: string;
    startIndex?: number;
    endIndex?: number;
  } = {};

  for (const line of match[1].split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator <= 0) {
      continue;
    }

    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();

    switch (key) {
      case "source":
        metadata.source = parseFrontmatterString(value);
        break;
      case "title":
        metadata.title = parseFrontmatterString(value);
        break;
      case "createdAt":
        metadata.createdAt = parseFrontmatterString(value);
        break;
      case "topic":
        metadata.topic = parseFrontmatterString(value);
        break;
      case "rawTopic":
        metadata.rawTopic = parseFrontmatterString(value);
        break;
      case "conversationId":
      case "id":
        metadata.conversationId = parseFrontmatterString(value);
        break;
      case "startIndex":
        metadata.startIndex = parseFrontmatterNumber(value);
        break;
      case "endIndex":
        metadata.endIndex = parseFrontmatterNumber(value);
        break;
      default:
        break;
    }
  }

  return metadata;
}

function parseFrontmatterString(value: string): string {
  if (!value) {
    return "";
  }

  try {
    return JSON.parse(value) as string;
  } catch {
    return value;
  }
}

function parseFrontmatterNumber(value: string): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
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
