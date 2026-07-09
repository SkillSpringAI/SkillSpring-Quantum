import assert from "node:assert";
import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";
import chatgptFixture from "../fixtures/sample-chatgpt-conversation.json" with { type: "json" };
import { runImportSource } from "../../core/imports/sourceIntake.js";

const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "chatgpt-sharded-import-smoke-"));

try {
  const exportFolder = path.join(tempRoot, "chatgpt-export-sharded");
  const outputRoot = path.join(tempRoot, "output");
  await fs.mkdir(exportFolder, { recursive: true });

  await fs.writeFile(
    path.join(exportFolder, "conversations-000.json"),
    JSON.stringify([chatgptFixture], null, 2),
    "utf-8"
  );
  await fs.writeFile(
    path.join(exportFolder, "conversations-001.json"),
    JSON.stringify([chatgptFixture], null, 2),
    "utf-8"
  );
  await fs.writeFile(
    path.join(exportFolder, "export_manifest.json"),
    JSON.stringify({
      export_files: [
        { path: "conversations-000.json", size_bytes: 1000 },
        { path: "conversations-001.json", size_bytes: 1000 },
        { path: "chat.html", size_bytes: 2000 }
      ]
    }, null, 2),
    "utf-8"
  );
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

  const result = await runImportSource(exportFolder, outputRoot);

  assert.equal(result.filesImported, 2, "Expected both conversation shard files to import");
  assert.equal(result.conversationFilesProcessed, 2, "Expected both conversation shard files to run through the conversation pipeline");
  assert.equal(result.filesFailed, 0, "Expected sharded ChatGPT package import to complete without failures");
  assert.ok(
    result.results.some((entry) => path.basename(entry.path) === "chat.html" && entry.status === "skipped"),
    "Expected chat.html to be skipped as a companion when shards are present"
  );
  assert.ok(
    result.retrievalSummary?.vendorSources.includes("chatgpt"),
    "Expected sharded ChatGPT package import to preserve the ChatGPT retrieval vendor"
  );

  const rerunProgress: Array<{ message: string; processingState?: string; reusedFiles?: number }> = [];
  const rerun = await runImportSource(exportFolder, outputRoot, (update) => {
    rerunProgress.push({
      message: update.message,
      processingState: update.processingState,
      reusedFiles: update.reusedFiles
    });
  });
  assert.equal(rerun.filesImported, 0, "Expected rerun to skip already imported shard files");
  assert.equal(rerun.filesFailed, 0, "Expected rerun skip behavior not to create failures");
  assert.ok(
    rerun.results.filter((entry) => entry.message.includes("already imported successfully")).length >= 2,
    "Expected rerun to report that prior successful shard imports were reused"
  );
  assert.ok(
    rerun.retrievalSummary?.vendorSources.includes("chatgpt"),
    "Expected rerun to preserve ChatGPT retrieval summary from the reused imported files"
  );
  assert.ok(
    rerunProgress.some((entry) => entry.processingState === "reusing_completed_file"),
    "Expected rerun progress to explicitly report completed-file reuse"
  );
  assert.ok(
    rerunProgress.some((entry) => entry.message.includes("keeping the existing archive and dataset artifacts")),
    "Expected rerun progress wording to explain that existing outputs were safely reused"
  );

  const ledgerPath = path.join(outputRoot, "imports", "successful-source-ledger.json");
  const latestRunPath = path.join(outputRoot, "imports", "latest-import-run.json");
  const historyDir = path.join(outputRoot, "imports", "history");
  const historyFiles = (await fs.readdir(historyDir))
    .filter((name) => name.endsWith(".json"))
    .map((name) => path.join(historyDir, name));

  const tamperReuseValidation = async (filePath: string, mutate: (value: any) => void) => {
    const value = JSON.parse(await fs.readFile(filePath, "utf-8"));
    mutate(value);
    await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf-8");
  };

  await tamperReuseValidation(ledgerPath, (value) => {
    for (const record of value.records ?? []) {
      if (record.reuseValidation) {
        record.reuseValidation.pipelineVersion = "pipeline.legacy";
      }
    }
  });
  await tamperReuseValidation(latestRunPath, (value) => {
    for (const result of value.results ?? []) {
      if (result.reuseValidation) {
        result.reuseValidation.pipelineVersion = "pipeline.legacy";
      }
    }
  });
  for (const historyFile of historyFiles) {
    await tamperReuseValidation(historyFile, (value) => {
      for (const result of value.results ?? []) {
        if (result.reuseValidation) {
          result.reuseValidation.pipelineVersion = "pipeline.legacy";
        }
      }
    });
  }

  const rerunAfterValidationMismatchProgress: Array<{ message: string; processingState?: string }> = [];
  const rerunAfterValidationMismatch = await runImportSource(exportFolder, outputRoot, (update) => {
    rerunAfterValidationMismatchProgress.push({
      message: update.message,
      processingState: update.processingState
    });
  });
  assert.equal(
    rerunAfterValidationMismatch.filesImported,
    2,
    "Expected stale reuse validation metadata to invalidate cache reuse and reimport both shard files"
  );
  assert.equal(
    rerunAfterValidationMismatch.results.filter((entry) => entry.message.includes("already imported successfully")).length,
    0,
    "Expected stale reuse validation metadata not to report already-imported reuse"
  );
  assert.ok(
    rerunAfterValidationMismatchProgress.some((entry) => entry.processingState === "processing_new_file"),
    "Expected invalidated rerun progress to fall back to explicit new-file processing"
  );

  await fs.rm(ledgerPath, { force: true });

  const rerunWithoutLedger = await runImportSource(exportFolder, outputRoot);
  assert.equal(rerunWithoutLedger.filesImported, 0, "Expected rerun without a ledger file to still reuse prior successful shard imports");
  assert.equal(rerunWithoutLedger.filesFailed, 0, "Expected history-based reuse fallback not to create failures");
  assert.ok(
    rerunWithoutLedger.results.filter((entry) => entry.message.includes("already imported successfully")).length >= 2,
    "Expected rerun without a ledger to recover reusable-success knowledge from import history"
  );
} finally {
  await fs.rm(tempRoot, { recursive: true, force: true });
}

console.log("chatgpt-sharded-import-smoke.test.ts passed");
