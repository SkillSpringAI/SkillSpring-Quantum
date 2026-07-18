import assert from "node:assert";
import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";
import chatgptFixture from "../fixtures/sample-chatgpt-conversation.json" with { type: "json" };
import { runImportSource } from "../../core/imports/sourceIntake.js";

const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "chatgpt-html-import-smoke-"));

try {
  const exportFolder = path.join(tempRoot, "chatgpt-export-legacy-html");
  const outputRoot = path.join(tempRoot, "output");
  await fs.mkdir(exportFolder, { recursive: true });

  await fs.writeFile(
    path.join(exportFolder, "chat.html"),
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

  const result = await runImportSource(exportFolder, outputRoot);

  assert.equal(result.filesImported, 1, "Expected legacy ChatGPT HTML export to import successfully.");
  assert.equal(result.filesFailed, 0, "Expected legacy ChatGPT HTML export not to fail.");
  assert.equal(result.conversationFilesProcessed, 1, "Expected legacy ChatGPT HTML export to run through the conversation pipeline.");
  assert.equal(result.retrievalSummary?.conversationFiles, 1, "Expected retrieval summary to include the imported legacy ChatGPT HTML file.");
  assert.ok(
    result.retrievalSummary?.vendorSources.includes("chatgpt"),
    "Expected legacy ChatGPT HTML import to preserve the ChatGPT retrieval vendor."
  );
} finally {
  await fs.rm(tempRoot, { recursive: true, force: true });
}

console.log("chatgpt-html-import-smoke.test.ts passed");
