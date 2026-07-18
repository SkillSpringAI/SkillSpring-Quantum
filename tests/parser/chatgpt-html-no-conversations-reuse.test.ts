import assert from "node:assert";
import os from "node:os";
import path from "node:path";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { runImportSource } from "../../core/imports/sourceIntake.js";

const tempRoot = await mkdtemp(path.join(os.tmpdir(), "skillspring-chatgpt-html-no-conversations-"));

try {
  const exportFolder = path.join(tempRoot, "chatgpt-legacy-empty");
  const outputRoot = path.join(tempRoot, "output");
  await mkdir(exportFolder, { recursive: true });
  await writeFile(
    path.join(exportFolder, "chat.html"),
    [
      "<html>",
      "<head><title>ChatGPT Data Export</title></head>",
      "<body>",
      "<script>",
      "var jsonData = [];",
      "</script>",
      "</body>",
      "</html>"
    ].join("\n"),
    "utf-8"
  );

  const firstRun = await runImportSource(exportFolder, outputRoot);
  assert.equal(firstRun.filesImported, 0, "Expected empty legacy chat.html export not to count as an imported conversation run.");
  assert.equal(firstRun.filesFailed, 1, "Expected empty legacy chat.html export to be treated as a failed usable import.");
  assert.equal(
    firstRun.results.filter((entry) => entry.status === "failed").length,
    1,
    "Expected the empty legacy chat.html file to be recorded as failed."
  );
  assert.equal(firstRun.retrievalSummary, null, "Expected no retrieval summary when no conversations were found.");

  const secondRun = await runImportSource(exportFolder, outputRoot);
  assert.equal(secondRun.filesImported, 0, "Expected rerun of empty legacy chat.html export not to produce imported output.");
  assert.equal(
    secondRun.results.filter((entry) => entry.message.includes("already imported successfully")).length,
    0,
    "Expected empty legacy chat.html export not to be treated as reusable success on rerun."
  );
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}

console.log("chatgpt-html-no-conversations-reuse.test.ts passed");
