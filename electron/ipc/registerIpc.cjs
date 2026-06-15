const path = require("node:path");
const { ipcMain } = require("electron");
const { runCommand } = require("../lib/runCommand.cjs");
const { readJsonOutput } = require("../lib/readJsonOutput.cjs");

function tsxCli(repoRoot) {
  return path.join(repoRoot, "node_modules", "tsx", "dist", "cli.mjs");
}

function repoRoot() {
  return path.resolve(__dirname, "..", "..");
}

async function runTsx(scriptPath, args = []) {
  const root = repoRoot();
  const fullScriptPath = path.join(root, scriptPath);

  const result = await runCommand(
    process.execPath,
    [tsxCli(root), fullScriptPath, ...args],
    { cwd: root, shell: process.platform === "win32" }
  );

  return {
    ...result,
    json: readJsonOutput(result.stdout)
  };
}

function ok(result, message) {
  return {
    ok: true,
    result: result.json ?? {},
    message,
    stdout: result.stdout,
    stderr: result.stderr,
    code: result.code
  };
}

function fail(result, fallback) {
  return {
    ok: false,
    error: result.stderr || fallback,
    stdout: result.stdout,
    stderr: result.stderr,
    code: result.code
  };
}

function registerIpc() {
  ipcMain.handle("app:ping", async () => {
    return { ok: true, message: "electron-main-ready" };
  });

  ipcMain.handle("governance:listRules", async () => {
    const result = await runTsx("core/governance/listRules.ts");
    return result.ok ? ok(result, "Governance rules listed.") : fail(result, "Failed to list governance rules.");
  });

  ipcMain.handle("governance:readRule", async (_event, payload) => {
    const result = await runTsx("core/governance/readRule.ts", [payload.filePath]);
    return result.ok ? ok(result, "Governance rule loaded.") : fail(result, "Failed to read governance rule.");
  });

  ipcMain.handle("governance:writeRule", async (_event, payload) => {
    const tempPath = path.join(repoRoot(), ".electron-temp-rule.json");
    const fs = require("node:fs/promises");
    await fs.writeFile(tempPath, payload.rawText, "utf-8");

    const result = await runTsx("core/governance/writeRule.ts", [
      payload.filePath,
      "--from-file",
      tempPath
    ]);

    try { await fs.unlink(tempPath); } catch {}

    return result.ok ? ok(result, "Governance rule saved.") : fail(result, "Failed to write governance rule.");
  });

  ipcMain.handle("db:listCollections", async (_event, payload = {}) => {
    const result = await runTsx("core/db/listCollections.ts", [payload.outputRoot || "organized_output"]);
    return result.ok ? ok(result, "DB collections listed.") : fail(result, "Failed to list DB collections.");
  });

  ipcMain.handle("db:readCollection", async (_event, payload) => {
    const result = await runTsx("core/db/readCollection.ts", [
      payload.outputRoot,
      payload.tier,
      payload.collection,
      String(payload.limit || 25)
    ]);

    return result.ok ? ok(result, "DB collection loaded.") : fail(result, "Failed to read DB collection.");
  });

  ipcMain.handle("diagnostics:run", async () => {
    const result = await runTsx("core/diagnostics/diagRunner.ts", ["organized_output"]);
    return result.ok ? ok(result, "Diagnostics completed.") : fail(result, "Failed to run diagnostics.");
  });

  ipcMain.handle("pipeline:runFile", async (_event, payload) => {
    const result = await runTsx("core/pipeline/pipeline.ts", [
      payload.inputFile,
      payload.outputRoot
    ]);

    return result.ok ? ok(result, "Single-file pipeline run completed.") : fail(result, "Failed to run pipeline.");
  });

  ipcMain.handle("batch:run", async () => {
    const result = await runTsx("core/batch/runBatch.ts", []);
    return result.ok ? ok(result, "Batch run completed.") : fail(result, "Failed to run batch.");
  });

  ipcMain.handle("batch:diag", async () => {
    const result = await runTsx("core/batch/buildBatchDiagnostics.ts", ["organized_output"]);
    return result.ok ? ok(result, "Batch diagnostics completed.") : fail(result, "Failed to build batch diagnostics.");
  });

  ipcMain.handle("batch:delta", async () => {
    const result = await runTsx("core/batch/buildBatchDelta.ts", ["organized_output"]);
    return result.ok ? ok(result, "Batch delta completed.") : fail(result, "Failed to build batch delta.");
  });

  ipcMain.handle("notifications:archive", async (_event, payload = {}) => {
    const result = await runTsx("core/notifications/readArchiveNotifications.ts", [
      payload.outputRoot || "organized_output",
      String(payload.limit || 20)
    ]);

    return result.ok ? ok(result, "Archive notifications loaded.") : fail(result, "Failed to load archive notifications.");
  });

  ipcMain.handle("archive:markdown", async (_event, payload = {}) => {
    const args = [payload.outputRoot || "organized_output"];
    if (payload.filePath) args.push(payload.filePath);

    const result = await runTsx("core/notifications/readMarkdownArchive.ts", args);
    return result.ok ? ok(result, "Markdown archive loaded.") : fail(result, "Failed to load markdown archive.");
  });

  ipcMain.handle("db:review:buildQueue", async (_event, payload = {}) => {
    const result = await runTsx("core/db/buildReviewQueue.ts", [payload.outputRoot || "organized_output"]);
    return result.ok ? ok(result, "Review queue built.") : fail(result, "Failed to build review queue.");
  });

  ipcMain.handle("db:review:decide", async (_event, payload) => {
    const result = await runTsx("core/db/reviewDecisions.ts", [
      payload.outputRoot || "organized_output",
      payload.decision,
      payload.queueKey,
      payload.reason || ""
    ]);

    return result.ok ? ok(result, "Review decision submitted.") : fail(result, "Failed to submit review decision.");
  });

  ipcMain.handle("db:promote", async (_event, payload = {}) => {
    const result = await runTsx("core/db/promoteCurated.ts", [payload.outputRoot || "organized_output"]);
    return result.ok ? ok(result, "Curated records promoted.") : fail(result, "Failed to promote curated records.");
  });

  ipcMain.handle("folders:merge", async (_event, payload = {}) => {
    const result = await runTsx("core/pipeline/mergeTopicFolders.ts", [payload.outputRoot || "organized_output"]);
    return result.ok ? ok(result, "Topic folders merged.") : fail(result, "Failed to merge topic folders.");
  });

  ipcMain.handle("purge:restore", async (_event, payload) => {
    const result = await runTsx("core/pipeline/restorePurged.ts", [
      payload.sourceFile,
      payload.outputRoot || "organized_output"
    ]);

    return result.ok ? ok(result, "Purged file restored.") : fail(result, "Failed to restore purged file.");
  });
}

module.exports = { registerIpc };
