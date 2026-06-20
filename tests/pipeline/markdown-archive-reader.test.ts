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

  const markdownPath = path.join(topicDir, "2025-01-01_docker_part_0.md");
  await writeFile(markdownPath, "# Docker Ports\n\nReadable archive.", "utf-8");
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

  assert.equal(result.topics.length, 1);
  assert.equal(result.topics[0].name, "2025-01_docker_ports");
  assert.equal(result.topics[0].files.length, 1);
  assert.equal(result.selectedFile.path, markdownPath);
  assert.match(result.content, /Readable archive/);
  assert.equal(result.attachmentSummaries.length, 1);
  assert.equal(result.attachmentSummaries[0].vendor, "gemini");
  assert.equal(result.attachmentSummaries[0].attachmentsArchived, 2);

  console.log("markdown-archive-reader.test.ts passed");
} finally {
  await rm(outputRoot, { recursive: true, force: true });
}
