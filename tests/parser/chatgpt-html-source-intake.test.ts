import assert from "node:assert";
import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";
import chatgptFixture from "../fixtures/sample-chatgpt-conversation.json" with { type: "json" };
import { inspectImportSource } from "../../core/imports/sourceIntake.js";

const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "chatgpt-html-source-intake-"));

try {
  const exportFolder = path.join(tempRoot, "chatgpt-export");
  await fs.mkdir(exportFolder, { recursive: true });
  await fs.writeFile(
    path.join(exportFolder, "chat.html"),
    [
      "<html>",
      "<head><title>ChatGPT Data Export</title></head>",
      "<body>",
      "<script>",
      "var jsonData = " + JSON.stringify([chatgptFixture]) + ";",
      "</script>",
      "</body>",
      "</html>"
    ].join(""),
    "utf-8"
  );
  await fs.writeFile(path.join(exportFolder, "user.json"), JSON.stringify({ id: "user_1" }, null, 2), "utf-8");

  const summary = await inspectImportSource(exportFolder);
  assert.equal(summary.inputType, "folder", "Expected ChatGPT HTML export fixture to inspect as a folder");
  assert.equal(summary.totalFiles, 2, "Expected two ChatGPT export files");
  assert.equal(summary.supportedFiles, 1, "Expected only chat.html to be importable");
  assert.equal(summary.countsByKind.chatgpt_export, 1, "Expected chat.html to be recognized as a ChatGPT export");
  assert.equal(summary.countsByKind.json_document, 0, "Expected user.json not to fall back to generic JSON import");
  assert.ok(
    summary.notes.some((note) => note.includes("recognized vendor export package")),
    "Expected ChatGPT package note to explain companion file handling"
  );

  const companionEntry = summary.sampleFiles.find((entry) => path.basename(entry.path) === "user.json");
  assert.ok(companionEntry, "Expected ChatGPT companion file to appear in sample files");
  assert.equal(companionEntry?.supported, false, "Expected ChatGPT companion file to be skipped");
  assert.equal(companionEntry?.kind, "unsupported", "Expected ChatGPT companion file to be marked unsupported");
  assert.ok(
    companionEntry?.reason.includes("Companion file for ChatGPT export"),
    "Expected ChatGPT companion file to explain that it is part of the export package"
  );
  assert.equal(summary.vendorSummaries[0]?.vendor, "chatgpt");
  assert.equal(summary.vendorSummaries[0]?.detectedFiles, 1);
  assert.equal(summary.vendorSummaries[0]?.companionFiles, 1);
} finally {
  await fs.rm(tempRoot, { recursive: true, force: true });
}

console.log("chatgpt-html-source-intake.test.ts passed");
