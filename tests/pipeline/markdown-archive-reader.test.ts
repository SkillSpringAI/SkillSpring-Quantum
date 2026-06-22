import assert from "node:assert";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const outputRoot = await mkdtemp(path.join(os.tmpdir(), "skillspring-markdown-archive-"));

try {
  const topicDir = path.join(outputRoot, "2025-01_docker_ports");
  const systemDir = path.join(outputRoot, "diagnostics");
  const manifestDir = path.join(outputRoot, "db", "manifests");
  const geminiArchiveRoot = path.join(outputRoot, "source_archive", "gemini_attachments");
  await mkdir(topicDir, { recursive: true });
  await mkdir(systemDir, { recursive: true });
  await mkdir(manifestDir, { recursive: true });
  await mkdir(geminiArchiveRoot, { recursive: true });
  const newerTopicDir = path.join(outputRoot, "2025-02_ai_exports");
  await mkdir(newerTopicDir, { recursive: true });

  const markdownPath = path.join(topicDir, "2025-01-01_docker_part_0.md");
  await writeFile(
    markdownPath,
    [
      "---",
      'conversationId: "conversation-1"',
      "source: claude",
      'title: "Docker Ports"',
      'createdAt: "2025-01-01T10:00:00.000Z"',
      'topic: "docker ports"',
      'rawTopic: "docker port mapping"',
      "startIndex: 0",
      "endIndex: 2",
      "---",
      "",
      "# Docker Ports",
      "",
      "Readable archive.",
      "",
      "Attachments:",
      "- notes.txt `attachment-1`"
    ].join("\n"),
    "utf-8"
  );
  const newerMarkdownPath = path.join(newerTopicDir, "2025-02-01_ai_exports_part_0.md");
  await writeFile(
    newerMarkdownPath,
    "# AI Exports\n\nLatest readable archive.",
    "utf-8"
  );
  await writeFile(path.join(systemDir, "ignore.md"), "# Ignore", "utf-8");
  await writeFile(
    path.join(manifestDir, "latest-gemini-attachment-archive.json"),
    JSON.stringify({
      archive_root: geminiArchiveRoot,
      attachments_referenced: 3,
      attachments_archived: 2,
      attachments_missing: 1
    }, null, 2),
    "utf-8"
  );

  const { stdout } = await execFileAsync(
    process.execPath,
    [
      "node_modules/tsx/dist/cli.mjs",
      "core/notifications/readMarkdownArchive.ts",
      outputRoot,
      markdownPath
    ],
    { cwd: process.cwd() }
  );

  const result = JSON.parse(stdout);

  assert.equal(result.topics.length, 2);
  assert.ok(result.topics.some((topic: { name: string }) => topic.name === "2025-01_docker_ports"));
  assert.ok(result.topics.some((topic: { name: string }) => topic.name === "2025-02_ai_exports"));
  assert.equal(result.selectedFile.path, markdownPath);
  assert.match(result.content, /Readable archive/);
  assert.equal(result.selectedFile.source, "claude");
  assert.equal(result.selectedFile.topic, "docker ports");
  assert.equal(result.selectedFile.rawTopic, "docker port mapping");
  assert.equal(result.selectedFile.conversationId, "conversation-1");
  assert.equal(result.selectedFile.startIndex, 0);
  assert.equal(result.selectedFile.endIndex, 2);
  assert.match(result.selectedFile.previewText, /Readable archive/);
  assert.equal(result.selectedFile.supportTier, "mvp_first_class");
  assert.equal(result.selectedFile.hasAttachmentReferences, true);
  assert.equal(result.selectedFile.hasPreservedAttachments, false);
  assert.equal(result.selectedFile.hasMissingAttachments, false);
  assert.equal(result.selectedFile.attachments.length, 1);
  assert.equal(result.selectedFile.attachments[0].label, "notes.txt");
  assert.equal(result.selectedFile.attachments[0].status, "referenced_only");
  assert.equal(result.attachmentSummaries.length, 1);
  assert.equal(result.attachmentSummaries[0].vendor, "gemini");
  assert.equal(result.attachmentSummaries[0].attachmentsArchived, 2);

  const geminiMarkdownPath = path.join(newerTopicDir, "2025-02-02_gemini_exports_part_0.md");
  await writeFile(
    geminiMarkdownPath,
    [
      "---",
      "source: gemini",
      'title: "Gemini Export"',
      'createdAt: "2025-02-02T10:00:00.000Z"',
      'topic: "ai exports"',
      "---",
      "",
      "# Gemini Export",
      "",
      "Attachments:",
      "- file.pdf `attachment-2` archive: `source_archive/gemini_attachments/file.pdf`"
    ].join("\n"),
    "utf-8"
  );

  const { stdout: geminiStdout } = await execFileAsync(
    process.execPath,
    [
      "node_modules/tsx/dist/cli.mjs",
      "core/notifications/readMarkdownArchive.ts",
      outputRoot,
      geminiMarkdownPath
    ],
    { cwd: process.cwd() }
  );

  const geminiResult = JSON.parse(geminiStdout);
  assert.equal(geminiResult.selectedFile.supportTier, "compatibility_fallback");
  assert.equal(geminiResult.selectedFile.hasAttachmentReferences, true);
  assert.equal(geminiResult.selectedFile.hasPreservedAttachments, true);
  assert.equal(geminiResult.selectedFile.hasMissingAttachments, true);
  assert.equal(geminiResult.selectedFile.attachments.length, 1);
  assert.equal(geminiResult.selectedFile.attachments[0].archivePath, "source_archive/gemini_attachments/file.pdf");
  assert.ok(geminiResult.selectedFile.attachments[0].resolvedArchivePath.endsWith(path.join("source_archive", "gemini_attachments", "file.pdf")));
  assert.equal(geminiResult.selectedFile.attachments[0].status, "preserved");

  const { stdout: defaultStdout } = await execFileAsync(
    process.execPath,
    [
      "node_modules/tsx/dist/cli.mjs",
      "core/notifications/readMarkdownArchive.ts",
      outputRoot
    ],
    { cwd: process.cwd() }
  );

  const defaultResult = JSON.parse(defaultStdout);
  assert.equal(defaultResult.selectedFile.path, geminiMarkdownPath, "Expected latest markdown file to auto-select by default");
  assert.match(defaultResult.content, /Gemini Export/);

  console.log("markdown-archive-reader.test.ts passed");
} finally {
  await rm(outputRoot, { recursive: true, force: true });
}
