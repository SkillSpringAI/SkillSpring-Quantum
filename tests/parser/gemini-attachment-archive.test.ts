import assert from "node:assert";
import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";
import { archiveGeminiConversationAttachments } from "../../core/pipeline/geminiAttachmentArchive.js";
import type { Conversation } from "../../core/parser/types.js";

const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "gemini-attachment-archive-"));
const sourceRoot = path.join(tempRoot, "My Activity");
const outputRoot = path.join(tempRoot, "organized_output");

await fs.mkdir(path.join(sourceRoot, "files"), { recursive: true });
await fs.writeFile(path.join(sourceRoot, "files", "plan.txt"), "draft scope lock", "utf-8");
await fs.writeFile(path.join(sourceRoot, "Encoded File (1).pdf"), "%PDF-1.4 demo", "utf-8");

const conversations: Conversation[] = [
  {
    id: "gemini-activity-0001",
    source: "gemini",
    title: "Scope planning",
    participants: ["user", "assistant"],
    messages: [
      {
        id: "gemini-user-1",
        role: "user",
        text: "Review this attachment",
        attachments: [
          {
            id: "files/plan.txt",
            label: "plan.txt"
          },
          {
            id: "files/missing.pdf",
            label: "missing.pdf"
          },
          {
            id: "Encoded%20File%20(1).pdf",
            label: "Encoded File (1).pdf"
          }
        ]
      },
      {
        id: "gemini-assistant-1",
        role: "assistant",
        text: "Here is the summary."
      }
    ]
  }
];

const summary = await archiveGeminiConversationAttachments(
  conversations,
  path.join(sourceRoot, "My Activity.html"),
  outputRoot
);

assert.equal(summary.attachments_referenced, 3);
assert.equal(summary.attachments_archived, 2);
assert.equal(summary.attachments_missing, 1);

const archivedAttachment = conversations[0].messages[0].attachments?.[0];
assert.ok(archivedAttachment?.archivePath, "Expected archived Gemini attachment path");
assert.equal(archivedAttachment?.previewPath, archivedAttachment?.archivePath);
assert.equal(archivedAttachment?.mimeType, "text/plain");

const archivedPath = path.join(outputRoot, archivedAttachment!.archivePath!.replace(/\//g, path.sep));
const archivedContent = await fs.readFile(archivedPath, "utf-8");
assert.equal(archivedContent, "draft scope lock");

const missingAttachment = conversations[0].messages[0].attachments?.[1];
assert.equal(missingAttachment?.archivePath, undefined);

const encodedAttachment = conversations[0].messages[0].attachments?.[2];
assert.ok(encodedAttachment?.archivePath, "Expected URL-encoded Gemini attachment path to resolve");
assert.equal(encodedAttachment?.mimeType, "application/pdf");

const manifestPath = path.join(outputRoot, "db", "manifests", "latest-gemini-attachment-archive.json");
const manifest = JSON.parse(await fs.readFile(manifestPath, "utf-8")) as {
  attachments_referenced: number;
  attachments_archived: number;
  attachments_missing: number;
  records: Array<{ attachment_id: string; status: string; archive_path?: string }>;
};

assert.equal(manifest.attachments_referenced, 3);
assert.equal(manifest.attachments_archived, 2);
assert.equal(manifest.attachments_missing, 1);
assert.equal(manifest.records.length, 3);
assert.ok(manifest.records.some((record) => record.attachment_id === "files/plan.txt" && record.status === "archived"));
assert.ok(manifest.records.some((record) => record.attachment_id === "files/missing.pdf" && record.status === "missing"));
assert.ok(manifest.records.some((record) => record.attachment_id === "Encoded%20File%20(1).pdf" && record.status === "archived"));

await fs.rm(tempRoot, { recursive: true, force: true });

console.log("gemini-attachment-archive.test.ts passed");
