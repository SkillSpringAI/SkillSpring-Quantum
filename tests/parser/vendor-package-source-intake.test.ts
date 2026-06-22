import assert from "node:assert";
import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";
import { fileURLToPath } from "node:url";
import { inspectImportSource } from "../../core/imports/sourceIntake.js";

const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "vendor-package-source-intake-"));

try {
  const claudeFixturePath = fileURLToPath(new URL("../fixtures/sample-claude-conversation.json", import.meta.url));
  const claudeFolder = path.join(tempRoot, "claude-export");
  await fs.mkdir(claudeFolder, { recursive: true });
  await fs.copyFile(claudeFixturePath, path.join(claudeFolder, "conversations.json"));
  await fs.writeFile(
    path.join(claudeFolder, "users.json"),
    JSON.stringify([{ id: "user_1", email: "person@example.com" }], null, 2),
    "utf-8"
  );

  const claudeSummary = await inspectImportSource(claudeFolder);
  assert.equal(claudeSummary.inputType, "folder", "Expected Claude export fixture to inspect as a folder");
  assert.equal(claudeSummary.totalFiles, 2, "Expected two Claude export files");
  assert.equal(claudeSummary.supportedFiles, 1, "Expected only Claude conversations.json to be importable");
  assert.equal(claudeSummary.countsByKind.conversation_json, 1, "Expected Claude conversations.json to be treated as a conversation import");
  assert.equal(claudeSummary.countsByKind.json_document, 0, "Expected Claude users.json not to fall back to generic JSON import");
  assert.ok(
    claudeSummary.notes.some((note) => note.includes("recognized vendor export package")),
    "Expected Claude package note to explain companion file handling"
  );
  assert.equal(
    path.basename(claudeSummary.sampleFiles[0]?.path ?? ""),
    "conversations.json",
    "Expected Claude package root to appear before companion files"
  );

  const claudeUsersEntry = claudeSummary.sampleFiles.find((entry) => path.basename(entry.path) === "users.json");
  assert.ok(claudeUsersEntry, "Expected Claude users.json to appear in sample files");
  assert.equal(claudeUsersEntry?.supported, false, "Expected Claude users.json to be skipped");
  assert.equal(claudeUsersEntry?.kind, "unsupported", "Expected Claude users.json to be marked unsupported");
  assert.ok(
    claudeUsersEntry?.reason.includes("Companion file for Claude export"),
    "Expected Claude users.json to explain that it is a package companion file"
  );
  assert.equal(claudeSummary.vendorSummaries[0]?.vendor, "claude");
  assert.equal(claudeSummary.vendorSummaries[0]?.detectedFiles, 1);
  assert.equal(claudeSummary.vendorSummaries[0]?.companionFiles, 1);

  const geminiFixturePath = fileURLToPath(new URL("../fixtures/sample-gemini-activity.html", import.meta.url));
  const geminiFolder = path.join(tempRoot, "gemini-export");
  await fs.mkdir(geminiFolder, { recursive: true });
  await fs.copyFile(geminiFixturePath, path.join(geminiFolder, "My Activity.html"));
  await fs.writeFile(path.join(geminiFolder, "scope-notes.txt"), "supporting notes", "utf-8");

  const geminiSummary = await inspectImportSource(geminiFolder);
  assert.equal(geminiSummary.inputType, "folder", "Expected Gemini export fixture to inspect as a folder");
  assert.equal(geminiSummary.totalFiles, 2, "Expected two Gemini export files");
  assert.equal(geminiSummary.supportedFiles, 1, "Expected only Gemini My Activity HTML to be importable");
  assert.equal(geminiSummary.countsByKind.gemini_activity_html, 1, "Expected Gemini My Activity HTML to be recognized");
  assert.equal(geminiSummary.countsByKind.text_document, 0, "Expected Gemini companion files not to fall back to generic text import");
  assert.ok(
    geminiSummary.notes.some((note) => note.includes("recognized vendor export package")),
    "Expected Gemini package note to explain companion file handling"
  );
  assert.equal(
    path.basename(geminiSummary.sampleFiles[0]?.path ?? ""),
    "My Activity.html",
    "Expected Gemini package root to appear before companion files"
  );

  const geminiCompanionEntry = geminiSummary.sampleFiles.find((entry) => path.basename(entry.path) === "scope-notes.txt");
  assert.ok(geminiCompanionEntry, "Expected Gemini companion file to appear in sample files");
  assert.equal(geminiCompanionEntry?.supported, false, "Expected Gemini companion file to be skipped");
  assert.equal(geminiCompanionEntry?.kind, "unsupported", "Expected Gemini companion file to be marked unsupported");
  assert.ok(
    geminiCompanionEntry?.reason.includes("Companion file for Gemini My Activity export"),
    "Expected Gemini companion file to explain that it is part of the export package"
  );
  assert.equal(geminiSummary.vendorSummaries[0]?.vendor, "gemini");
  assert.equal(geminiSummary.vendorSummaries[0]?.detectedFiles, 1);
  assert.equal(geminiSummary.vendorSummaries[0]?.companionFiles, 1);
} finally {
  await fs.rm(tempRoot, { recursive: true, force: true });
}

console.log("vendor-package-source-intake.test.ts passed");
