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

  const legacyHtmlExportFolder = path.join(tempRoot, "chatgpt-export-legacy-html");
  await fs.mkdir(legacyHtmlExportFolder, { recursive: true });
  await fs.writeFile(
    path.join(legacyHtmlExportFolder, "chat.html"),
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
  await fs.writeFile(
    path.join(legacyHtmlExportFolder, "file_0001-image.png"),
    "binary-placeholder",
    "utf-8"
  );
  await fs.mkdir(path.join(legacyHtmlExportFolder, "69090dd7-6ba8-8322-886a-3c0dd3678e10"), { recursive: true });
  await fs.writeFile(
    path.join(legacyHtmlExportFolder, "69090dd7-6ba8-8322-886a-3c0dd3678e10", "metadata.json"),
    JSON.stringify({ ok: true }, null, 2),
    "utf-8"
  );
  await fs.mkdir(path.join(legacyHtmlExportFolder, "user-TJUulLqHTxSF4TxWDVZYgym4"), { recursive: true });
  await fs.writeFile(
    path.join(legacyHtmlExportFolder, "user-TJUulLqHTxSF4TxWDVZYgym4", "profile.png"),
    "binary-placeholder",
    "utf-8"
  );

  const legacyHtmlSummary = await inspectImportSource(legacyHtmlExportFolder);
  assert.equal(
    legacyHtmlSummary.totalFiles,
    1,
    "Expected legacy ChatGPT HTML package inspection to stay focused on chat.html instead of every attachment and nested folder file"
  );
  assert.equal(
    legacyHtmlSummary.supportedFiles,
    1,
    "Expected legacy ChatGPT HTML package to keep chat.html as the single importable entry"
  );
  assert.equal(
    legacyHtmlSummary.sampleFiles[0]?.displayLabel,
    "ChatGPT legacy chat bundle",
    "Expected legacy ChatGPT HTML package to surface a distinct legacy bundle label"
  );
  assert.ok(
    legacyHtmlSummary.notes.some((note) => note.includes("Legacy ChatGPT chat bundle detected")),
    "Expected legacy ChatGPT HTML package note to explain the attachment-sparing import path"
  );
  assert.ok(
    legacyHtmlSummary.notes.some((note) => note.includes("stop here and switch paths before starting a long import")),
    "Expected legacy ChatGPT HTML package note to warn when the older chat.html lane may be the wrong heavy path"
  );
  assert.equal(legacyHtmlSummary.vendorSummaries[0]?.vendor, "chatgpt");
  assert.equal(legacyHtmlSummary.vendorSummaries[0]?.detectedFiles, 1);
  assert.equal(legacyHtmlSummary.vendorSummaries[0]?.companionFiles, 0);

  const shardedExportFolder = path.join(tempRoot, "chatgpt-export-sharded");
  await fs.mkdir(shardedExportFolder, { recursive: true });
  await fs.writeFile(
    path.join(shardedExportFolder, "conversations-000.json"),
    JSON.stringify([chatgptFixture], null, 2),
    "utf-8"
  );
  await fs.writeFile(
    path.join(shardedExportFolder, "conversations-001.json"),
    JSON.stringify([chatgptFixture], null, 2),
    "utf-8"
  );
  await fs.writeFile(
    path.join(shardedExportFolder, "export_manifest.json"),
    JSON.stringify({
      export_files: [
        { path: "chat.html", size_bytes: 1234 },
        { path: "conversations-000.json", size_bytes: 5678 },
        { path: "conversations-001.json", size_bytes: 6789 },
        { path: "library_files.json", size_bytes: 222 }
      ]
    }, null, 2),
    "utf-8"
  );
  await fs.writeFile(
    path.join(shardedExportFolder, "chat.html"),
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
  await fs.writeFile(path.join(shardedExportFolder, "ads.json"), JSON.stringify({ campaigns: [] }, null, 2), "utf-8");
  await fs.writeFile(path.join(shardedExportFolder, "library_files.json"), JSON.stringify([], null, 2), "utf-8");
  await fs.writeFile(path.join(shardedExportFolder, "user.json"), JSON.stringify({ id: "user_1" }, null, 2), "utf-8");

  const shardedSummary = await inspectImportSource(shardedExportFolder);
  assert.equal(shardedSummary.inputType, "folder", "Expected sharded ChatGPT export to inspect as a folder");
  assert.equal(shardedSummary.supportedFiles, 2, "Expected conversation shard files to be the supported import entries");
  assert.equal(shardedSummary.countsByKind.chatgpt_export, 2, "Expected both conversation shard files to be recognized as ChatGPT exports");
  assert.equal(shardedSummary.countsByKind.json_document, 0, "Expected manifest and metadata files not to fall back to generic JSON import");
  assert.ok(
    shardedSummary.notes.some((note) => note.includes("conversation shards directly")),
    "Expected sharded ChatGPT package note to explain direct shard batching"
  );

  const htmlCompanionEntry = shardedSummary.sampleFiles.find((entry) => path.basename(entry.path) === "chat.html");
  assert.ok(htmlCompanionEntry, "Expected chat.html to show as a companion entry in the sharded package");
  assert.equal(htmlCompanionEntry?.supported, false, "Expected chat.html to be skipped when conversation shards are present");
  assert.ok(
    htmlCompanionEntry?.reason.includes("conversation shard files as the main import source"),
    "Expected chat.html companion reason to explain the shard-first package path"
  );
  const adsCompanionEntry = shardedSummary.sampleFiles.find((entry) => path.basename(entry.path) === "ads.json");
  assert.ok(adsCompanionEntry, "Expected ads.json to show as a companion entry in the sharded package");
  assert.equal(adsCompanionEntry?.supported, false, "Expected ads.json to be skipped when conversation shards are present");
  assert.ok(
    adsCompanionEntry?.reason.includes("Companion file for ChatGPT export"),
    "Expected ads.json companion reason to explain package handling"
  );
  assert.equal(shardedSummary.vendorSummaries[0]?.vendor, "chatgpt");
  assert.equal(shardedSummary.vendorSummaries[0]?.detectedFiles, 2);
  assert.ok((shardedSummary.vendorSummaries[0]?.companionFiles ?? 0) >= 4);

  const legacyHtmlWithRendererFolder = path.join(tempRoot, "chatgpt-export-legacy-html-renderer");
  await fs.mkdir(legacyHtmlWithRendererFolder, { recursive: true });
  await fs.writeFile(
    path.join(legacyHtmlWithRendererFolder, "chat.html"),
    [
      "<html>",
      "<head><title>ChatGPT Data Export</title></head>",
      "<body>",
      "<script>",
      "var jsonData = " + JSON.stringify([chatgptFixture]) + ";",
      "for (const conversation of jsonData) {",
      "  const currentNode = conversation.current_node;",
      "  if (currentNode) {",
      "    var node = conversation.mapping[currentNode];",
      "    console.log(node?.id);",
      "  }",
      "}",
      "</script>",
      "</body>",
      "</html>"
    ].join(""),
    "utf-8"
  );

  const rendererSummary = await inspectImportSource(legacyHtmlWithRendererFolder);
  assert.equal(
    rendererSummary.supportedFiles,
    1,
    "Expected legacy ChatGPT HTML export with trailing renderer script to remain importable"
  );
  assert.equal(
    rendererSummary.countsByKind.chatgpt_export,
    1,
    "Expected legacy ChatGPT HTML export with trailing renderer script to remain recognized as ChatGPT"
  );
} finally {
  await fs.rm(tempRoot, { recursive: true, force: true });
}

console.log("chatgpt-html-source-intake.test.ts passed");
