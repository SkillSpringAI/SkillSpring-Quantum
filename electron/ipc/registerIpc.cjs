const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const { spawn } = require("node:child_process");
const { app, ipcMain, dialog, shell } = require("electron");
const { runCommand } = require("../lib/runCommand.cjs");
const { readJsonOutput } = require("../lib/readJsonOutput.cjs");

function runtimeRoot() {
  if (isPackagedRuntime()) {
    return app.getAppPath();
  }

  return path.resolve(__dirname, "..", "..");
}

function isPackagedRuntime() {
  return app.isPackaged;
}

function runtimeCwd() {
  if (isPackagedRuntime()) {
    return process.resourcesPath || path.dirname(process.execPath);
  }

  return runtimeRoot();
}

function tsxCli(root) {
  return path.join(root, "node_modules", "tsx", "dist", "cli.mjs");
}

function runtimeCommand() {
  if (isPackagedRuntime()) {
    return process.execPath;
  }

  return process.env.npm_node_execpath || process.execPath || "node";
}

function recommendedImportHeapMb() {
  const totalMemoryMb = Math.floor(os.totalmem() / (1024 * 1024));
  const target = Math.floor(totalMemoryMb * 0.4);
  const clamped = Math.max(2048, Math.min(4096, target));
  return Math.floor(clamped / 256) * 256;
}

function runtimeScriptPath(relativeScriptPath) {
  const root = runtimeRoot();
  if (!isPackagedRuntime()) {
    return path.join(root, relativeScriptPath);
  }

  const normalized = relativeScriptPath.replace(/\.ts$/, ".js");
  return path.join(root, "dist", normalized);
}

function runtimeEnv(extraEnv = {}) {
  return {
    ...process.env,
    ...(isPackagedRuntime() ? { ELECTRON_RUN_AS_NODE: "1" } : {}),
    ...extraEnv
  };
}

function runtimeScriptArgs(relativeScriptPath, args = [], options = {}) {
  const commandArgs = [];
  if (options.largeHeap) {
    commandArgs.push(`--max-old-space-size=${recommendedImportHeapMb()}`);
  }

  const scriptPath = runtimeScriptPath(relativeScriptPath);

  if (isPackagedRuntime()) {
    return [...commandArgs, scriptPath, ...args];
  }

  return [...commandArgs, tsxCli(runtimeRoot()), scriptPath, ...args];
}

const AGENT_DEFAULT_PORT = 5678;
let agentProcess = null;
let agentStartPromise = null;
let agentPort = AGENT_DEFAULT_PORT;
let agentOutputRoot = "organized_output";
let ollamaStartPromise = null;
let activeImportRun = null;

function agentScriptPath() {
  return "skillspring-quantum-agent/agent/main.ts";
}

async function runRuntimeScript(scriptPath, args = [], options = {}) {
  const result = await runCommand(
    runtimeCommand(),
    runtimeScriptArgs(scriptPath, args, options),
    {
      cwd: runtimeCwd(),
      shell: false,
      env: runtimeEnv(options.env || {})
    }
  );

  return {
    ...result,
    json: readJsonOutput(result.stdout)
  };
}

async function runImportWithProgress(webContents, inputPath, outputRoot) {
  return await new Promise((resolve) => {
    if (activeImportRun?.child && !activeImportRun.child.killed) {
      resolve({
        ok: false,
        code: -1,
        stdout: "",
        stderr: "Another import is already running. Force-stop it before starting a different import.",
        json: null
      });
      return;
    }

    const child = spawn(
      runtimeCommand(),
      runtimeScriptArgs(
        "core/imports/runImportSource.ts",
        [inputPath, outputRoot || "organized_output", "--progress"],
        { largeHeap: true }
      ),
      {
        cwd: runtimeCwd(),
        env: runtimeEnv(),
        shell: false,
        windowsHide: true
      }
    );

    const importRunState = {
      child,
      webContents,
      inputPath,
      outputRoot,
      stoppedByUser: false
    };
    activeImportRun = importRunState;

    let stdout = "";
    let stderr = "";
    let buffer = "";

    child.stdout.on("data", (data) => {
      const text = data.toString();
      stdout += text;
      buffer += text;

      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("__SSQ_PROGRESS__")) {
          continue;
        }

        try {
          const payload = JSON.parse(line.slice("__SSQ_PROGRESS__".length));
          webContents.send("imports:progress", payload);
        } catch {
          // Ignore malformed progress lines so the final import result can still complete.
        }
      }
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("error", (error) => {
      if (activeImportRun?.child === child) {
        activeImportRun = null;
      }
      resolve({
        ok: false,
        code: -1,
        stdout,
        stderr: stderr + error.message,
        json: null
      });
    });

    child.on("close", (code) => {
      if (activeImportRun?.child === child) {
        activeImportRun = null;
      }

      const stoppedByUser = importRunState.stoppedByUser;
      const cleanedStdout = stdout
        .split(/\r?\n/)
        .filter((line) => line && !line.startsWith("__SSQ_PROGRESS__"))
        .join("\n");

      resolve({
        ok: code === 0 && !stoppedByUser,
        code,
        stdout: cleanedStdout,
        stderr: stoppedByUser
          ? "Import force-stopped by request from the Imports screen."
          : stderr,
        json: readJsonOutput(cleanedStdout)
      });
    });
  });
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

function formatImportFailure(result, fallback) {
  const stderr = result.stderr || "";
  if (/force-stopped by request|stopped by request/i.test(stderr)) {
    return {
      ok: false,
      error:
        "Import force-stopped by request. Quantum stopped the active import before it finished, so this run should not be treated as completed output.",
      stdout: result.stdout,
      stderr: result.stderr,
      code: result.code
    };
  }
  if (/heap out of memory|allocation failed - javascript heap out of memory/i.test(stderr)) {
    return {
      ok: false,
      error:
        "Quantum ran out of local import memory while processing this export. This usually means the export is very large. Try again after closing other memory-heavy apps. If it still fails, this export likely needs a more streaming-friendly import path.",
      stdout: result.stdout,
      stderr: result.stderr,
      code: result.code
    };
  }

  return fail(result, fallback);
}

async function requestAgent(pathname, options = {}) {
  const response = await fetch(`http://127.0.0.1:${agentPort}${pathname}`, options);
  const text = await response.text();
  const json = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(json.error || `Agent request failed with status ${response.status}`);
  }

  return json;
}

async function checkRunningAgentHealth() {
  try {
    return await requestAgent("/health");
  } catch {
    return null;
  }
}

async function checkOllamaHealth() {
  try {
    const response = await fetch("http://127.0.0.1:11434/api/tags");
    return response.ok;
  } catch {
    return false;
  }
}

function candidateOllamaExecutables() {
  const candidates = [];

  if (process.platform === "win32") {
    const localAppData = process.env.LOCALAPPDATA;
    const programFiles = process.env.ProgramFiles;

    if (localAppData) {
      candidates.push(path.join(localAppData, "Programs", "Ollama", "ollama.exe"));
    }

    if (programFiles) {
      candidates.push(path.join(programFiles, "Ollama", "ollama.exe"));
    }

    candidates.push("ollama.exe");
  }

  candidates.push("ollama");

  return [...new Set(candidates)];
}

function resolveOllamaExecutable() {
  for (const candidate of candidateOllamaExecutables()) {
    if (candidate.includes(path.sep) && fs.existsSync(candidate)) {
      return candidate;
    }

    if (!candidate.includes(path.sep)) {
      return candidate;
    }
  }

  return null;
}

function currentDriveRoot() {
  return path.parse(runtimeCwd()).root || process.cwd();
}

function bytesToGb(bytes) {
  return Number((bytes / (1024 ** 3)).toFixed(1));
}

function getLocalMachineProfile() {
  const totalMemoryBytes = os.totalmem();
  const freeMemoryBytes = os.freemem();
  let freeDiskBytes = null;

  try {
    const diskStats = fs.statfsSync(currentDriveRoot());
    freeDiskBytes = diskStats.bavail * diskStats.bsize;
  } catch {
    freeDiskBytes = null;
  }

  return {
    totalMemoryGb: bytesToGb(totalMemoryBytes),
    freeMemoryGb: bytesToGb(freeMemoryBytes),
    freeDiskGb: freeDiskBytes === null ? null : bytesToGb(freeDiskBytes)
  };
}

function recommendedAssistantModels() {
  return {
    llm: {
      model: "llama3.2",
      label: "Recommended chat model",
      minimumMemoryGb: 8,
      minimumDiskGb: 4
    },
    embeddings: {
      model: "nomic-embed-text",
      label: "Recommended embedding model",
      minimumMemoryGb: 8,
      minimumDiskGb: 1
    }
  };
}

function assessModelInstallReadiness(kind) {
  const profile = getLocalMachineProfile();
  const target = recommendedAssistantModels()[kind];
  const enoughMemory = profile.totalMemoryGb >= target.minimumMemoryGb;
  const enoughDisk = profile.freeDiskGb === null ? true : profile.freeDiskGb >= target.minimumDiskGb;

  return {
    kind,
    model: target.model,
    label: target.label,
    minimumMemoryGb: target.minimumMemoryGb,
    minimumDiskGb: target.minimumDiskGb,
    detectedMemoryGb: profile.totalMemoryGb,
    detectedFreeMemoryGb: profile.freeMemoryGb,
    detectedFreeDiskGb: profile.freeDiskGb,
    installReady: enoughDisk,
    performanceReady: enoughMemory,
    blockers: [
      ...(enoughDisk || profile.freeDiskGb === null
        ? []
        : [`Needs about ${target.minimumDiskGb} GB free storage; detected ${profile.freeDiskGb} GB.`])
    ],
    warnings: [
      ...(enoughMemory ? [] : [`Needs about ${target.minimumMemoryGb} GB RAM for smoother local use; detected ${profile.totalMemoryGb} GB.`])
    ]
  };
}

function extractMissingInstallKinds(parsed) {
  const missing = Array.isArray(parsed?.missing) ? parsed.missing : [];
  const kinds = [];

  if (missing.some((item) => /compatible llm model/i.test(String(item)))) {
    kinds.push("llm");
  }

  if (missing.some((item) => /compatible embedding model/i.test(String(item)))) {
    kinds.push("embeddings");
  }

  return kinds;
}

function buildReadinessPlan(parsed) {
  return {
    machineProfile: getLocalMachineProfile(),
    recommended: extractMissingInstallKinds(parsed).map((kind) => assessModelInstallReadiness(kind))
  };
}

async function tryStartOllamaRuntime() {
  if (await checkOllamaHealth()) {
    return { attempted: false, started: true, reachable: true };
  }

  if (ollamaStartPromise) {
    return await ollamaStartPromise;
  }

  const executable = resolveOllamaExecutable();
  if (!executable) {
    return { attempted: false, started: false, reachable: false, reason: "Ollama executable not found." };
  }

  ollamaStartPromise = new Promise((resolve) => {
    try {
      const child = spawn(executable, ["serve"], {
        cwd: runtimeCwd(),
        shell: false,
        detached: true,
        windowsHide: true,
        stdio: "ignore",
        env: runtimeEnv({
          NODE_NO_WARNINGS: "1"
        })
      });

      child.unref();
    } catch (error) {
      ollamaStartPromise = null;
      resolve({
        attempted: true,
        started: false,
        reachable: false,
        reason: error instanceof Error ? error.message : String(error)
      });
      return;
    }

    const startedAt = Date.now();
    const poll = async () => {
      if (await checkOllamaHealth()) {
        ollamaStartPromise = null;
        resolve({ attempted: true, started: true, reachable: true });
        return;
      }

      if (Date.now() - startedAt > 12_000) {
        ollamaStartPromise = null;
        resolve({
          attempted: true,
          started: false,
          reachable: false,
          reason: "Ollama did not become reachable in time."
        });
        return;
      }

      setTimeout(poll, 500);
    };

    void poll();
  });

  return await ollamaStartPromise;
}

function sanitizeAgentStatusText(text) {
  return (text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/ExperimentalWarning: SQLite is an experimental feature/i.test(line))
    .filter((line) => !/\(Use `node --trace-warnings/i.test(line))
    .join(" ")
    .trim();
}

function buildPrerequisiteSummary(parsed, stderr) {
  const details = parsed && typeof parsed === "object" ? parsed.details || {} : {};
  const llm = typeof details.llm === "string" ? details.llm : "";
  const embeddings = typeof details.embeddings === "string" ? details.embeddings : "";
  const missing = Array.isArray(parsed?.missing) ? parsed.missing : [];

  if (parsed?.ok) {
    const parts = ["Assistant prerequisites look ready."];
    if (llm) {
      parts.push(`LLM: ${llm}.`);
    }
    if (embeddings) {
      parts.push(`Embeddings: ${embeddings}.`);
    }
    return parts.join(" ");
  }

  if (missing.length > 0) {
    return `Assistant prerequisites still need attention: ${missing.join(", ")}.`;
  }

  return sanitizeAgentStatusText(stderr) || "Assistant prerequisite check did not return a clean result.";
}

async function runAgentHealthProbe(outputRoot) {
  await tryStartOllamaRuntime();

  const result = await runCommand(
    runtimeCommand(),
    runtimeScriptArgs(agentScriptPath(), ["--health-json", "--output", outputRoot || "organized_output"]),
    {
      cwd: runtimeCwd(),
      shell: false,
      env: runtimeEnv({
        NODE_NO_WARNINGS: "1"
      })
    }
  );

  const parsed = readJsonOutput(result.stdout) || {};
  const stdout = result.stdout || "";
  const stderr = result.stderr || "";
  const readiness = buildReadinessPlan(parsed);

  return {
    running: false,
    serverReachable: false,
    outputRoot: outputRoot || "organized_output",
    port: agentPort,
    prerequisitesOk: Boolean(parsed.ok),
    summary: buildPrerequisiteSummary(parsed, stderr),
    details: {
      code: result.code,
      stdout,
      stderr,
      parsed,
      readiness
    }
  };
}

function buildRunningAgentStatus(health, outputRoot, port) {
  return {
    running: true,
    serverReachable: true,
    outputRoot: outputRoot || agentOutputRoot,
    port: port || agentPort,
    prerequisitesOk: true,
    summary: "Local assistant is running.",
    details: health
  };
}

async function installOllamaModel(model) {
  await tryStartOllamaRuntime();

  const executable = resolveOllamaExecutable();
  if (!executable) {
    throw new Error("Ollama executable not found.");
  }

  return await runCommand(executable, ["pull", model], {
    cwd: runtimeCwd(),
    shell: false,
    env: runtimeEnv({
      NODE_NO_WARNINGS: "1"
    })
  });
}

async function stopAgentServer() {
  if (!agentProcess) {
    return false;
  }

  const processToStop = agentProcess;
  agentProcess = null;
  agentStartPromise = null;

  return await new Promise((resolve) => {
    const timeout = setTimeout(() => {
      try {
        processToStop.kill("SIGKILL");
      } catch {}
      resolve(true);
    }, 5000);

    processToStop.once("exit", () => {
      clearTimeout(timeout);
      resolve(true);
    });

    try {
      processToStop.kill();
    } catch {
      clearTimeout(timeout);
      resolve(false);
    }
  });
}

async function ensureAgentServer(outputRoot, port = AGENT_DEFAULT_PORT) {
  const desiredOutputRoot = outputRoot || "organized_output";
  await tryStartOllamaRuntime();

  if (agentProcess) {
    const health = await checkRunningAgentHealth();
    if (health && agentPort === port && agentOutputRoot === desiredOutputRoot) {
      return {
        port: agentPort,
        outputRoot: agentOutputRoot,
        health
      };
    }

    await stopAgentServer();
  }

  if (agentStartPromise) {
    return await agentStartPromise;
  }

  agentPort = port;
  agentOutputRoot = desiredOutputRoot;

  agentStartPromise = new Promise((resolve, reject) => {
    const child = require("node:child_process").spawn(
      runtimeCommand(),
      runtimeScriptArgs(
        agentScriptPath(),
        [
        "--server",
        "--port",
        String(port),
        "--output",
        desiredOutputRoot
        ]
      ),
      {
        cwd: runtimeCwd(),
        shell: false,
        windowsHide: true,
        env: runtimeEnv({
          NODE_NO_WARNINGS: "1",
          AGENT_PORT: String(port),
          SKILLSPRING_OUTPUT: desiredOutputRoot
        })
      }
    );

    agentProcess = child;

    let stderr = "";
    child.stdout?.on("data", (data) => {
      console.log("[agent stdout]", data.toString().trim());
    });
    child.stderr?.on("data", (data) => {
      const text = data.toString();
      stderr += text;
      console.error("[agent stderr]", text.trim());
    });

    child.once("exit", (code) => {
      if (agentProcess === child) {
        agentProcess = null;
      }
      agentStartPromise = null;
      if (code !== 0) {
        console.error("[agent exit]", code);
      }
    });

    child.once("error", (error) => {
      if (agentProcess === child) {
        agentProcess = null;
      }
      agentStartPromise = null;
      reject(error);
    });

    const startedAt = Date.now();
    const poll = async () => {
      const health = await checkRunningAgentHealth();
      if (health) {
        agentStartPromise = null;
        resolve({
          port,
          outputRoot: desiredOutputRoot,
          health: buildRunningAgentStatus(health, desiredOutputRoot, port)
        });
        return;
      }

      if (!agentProcess) {
        agentStartPromise = null;
        reject(new Error(stderr || "Agent process exited before becoming ready."));
        return;
      }

      if (Date.now() - startedAt > 30000) {
        agentStartPromise = null;
        reject(new Error(stderr || "Agent startup timed out."));
        return;
      }

      setTimeout(poll, 500);
    };

    void poll();
  });

  return await agentStartPromise;
}

function registerIpc() {
  ipcMain.handle("app:ping", async () => {
    return { ok: true, message: "electron-main-ready" };
  });

  ipcMain.handle("agent:start", async (_event, payload = {}) => {
    try {
      const started = await ensureAgentServer(payload.outputRoot || "organized_output", payload.port || AGENT_DEFAULT_PORT);
      return {
        ok: true,
        result: {
          running: true,
          port: started.port,
          outputRoot: started.outputRoot,
          health: started.health
        },
        message: "Local agent started."
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });

  ipcMain.handle("agent:stop", async () => {
    try {
      const stopped = await stopAgentServer();
      return {
        ok: true,
        result: {
          stopped,
          running: false,
          port: agentPort
        },
        message: stopped ? "Local agent stopped." : "Local agent was not running."
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });

  ipcMain.handle("agent:health", async (_event, payload = {}) => {
    try {
      await tryStartOllamaRuntime();
      const liveHealth = await checkRunningAgentHealth();
      if (liveHealth) {
        return {
          ok: true,
          result: buildRunningAgentStatus(liveHealth, payload.outputRoot || agentOutputRoot, agentPort),
          message: "Local agent health loaded."
        };
      }

      const probe = await runAgentHealthProbe(payload.outputRoot || "organized_output");
      return {
        ok: true,
        result: probe,
        message: "Local agent prerequisite check completed."
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });

  ipcMain.handle("agent:installModel", async (_event, payload = {}) => {
    try {
      if (!payload.model || typeof payload.model !== "string") {
        throw new Error("A model name is required.");
      }

      const kind = payload.kind === "llm" ? "llm" : "embeddings";
      const readiness = assessModelInstallReadiness(kind);
      if (readiness.model === payload.model && !readiness.installReady) {
        throw new Error(readiness.blockers.join(" "));
      }

      const result = await installOllamaModel(payload.model);
      const probe = await runAgentHealthProbe(agentOutputRoot || "organized_output");

      return {
        ok: result.code === 0,
        result: {
          installed: result.code === 0,
          model: payload.model,
          kind,
          stdout: result.stdout,
          stderr: result.stderr,
          health: probe
        },
        message: result.code === 0 ? `Installed ${payload.model}.` : `Failed to install ${payload.model}.`,
        stdout: result.stdout,
        stderr: result.stderr,
        code: result.code
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });

  ipcMain.handle("agent:chat", async (_event, payload = {}) => {
    try {
      await ensureAgentServer(payload.outputRoot || "organized_output", payload.port || AGENT_DEFAULT_PORT);
      const response = await requestAgent("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: payload.sessionId,
          message: payload.message,
          system_prompt: payload.systemPrompt
        })
      });

      return {
        ok: true,
        result: response,
        message: "Local agent response received."
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });

  ipcMain.handle("agent:sessions:list", async (_event, payload = {}) => {
    try {
      await ensureAgentServer(payload.outputRoot || "organized_output", payload.port || AGENT_DEFAULT_PORT);
      const response = await requestAgent("/sessions");
      return {
        ok: true,
        result: response,
        message: "Local agent sessions loaded."
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });

  ipcMain.handle("agent:sessions:create", async (_event, payload = {}) => {
    try {
      await ensureAgentServer(payload.outputRoot || "organized_output", payload.port || AGENT_DEFAULT_PORT);
      const response = await requestAgent("/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: payload.title
        })
      });
      return {
        ok: true,
        result: response,
        message: "Local agent session created."
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });

  ipcMain.handle("agent:index", async (_event, payload = {}) => {
    try {
      if (agentProcess) {
        const response = await requestAgent("/index", { method: "POST" });
        return {
          ok: true,
          result: response,
          message: "Local agent indexing triggered."
        };
      }

      const result = await runCommand(
        runtimeCommand(),
        runtimeScriptArgs(
          agentScriptPath(),
          [
          "--index",
          "--output",
          payload.outputRoot || "organized_output"
          ]
        ),
        {
          cwd: runtimeCwd(),
          shell: false,
          env: runtimeEnv()
        }
      );

      if (!result.ok) {
        return {
          ok: false,
          error: result.stderr || "Failed to index through the local agent.",
          stdout: result.stdout,
          stderr: result.stderr,
          code: result.code
        };
      }

      return {
        ok: true,
        result: {
          stdout: result.stdout,
          stderr: result.stderr,
          code: result.code
        },
        message: "Local agent indexing completed."
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });

  ipcMain.handle("dialog:pickFile", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [
        { name: "Supported Files", extensions: ["json", "txt", "md", "markdown", "csv", "log", "pdf"] },
        { name: "All Files", extensions: ["*"] }
      ]
    });

    return {
      ok: true,
      result: {
        canceled: result.canceled,
        path: result.filePaths[0] || null
      }
    };
  });

  ipcMain.handle("dialog:pickFolder", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory"]
    });

    return {
      ok: true,
      result: {
        canceled: result.canceled,
        path: result.filePaths[0] || null
      }
    };
  });

  ipcMain.handle("shell:openPath", async (_event, payload) => {
    const fs = require("node:fs/promises");

    try {
      const stat = await fs.stat(payload.targetPath);
      if (stat.isDirectory()) {
        const error = await shell.openPath(payload.targetPath);
        return error
          ? { ok: false, error }
          : { ok: true, result: { targetPath: payload.targetPath } };
      }

      shell.showItemInFolder(payload.targetPath);
      return { ok: true, result: { targetPath: payload.targetPath } };
    } catch {
      return { ok: false, error: "Path not found: " + payload.targetPath };
    }
  });

  ipcMain.handle("shell:pathExists", async (_event, payload) => {
    const fs = require("node:fs/promises");

    try {
      await fs.stat(payload.targetPath);
      return {
        ok: true,
        result: {
          targetPath: payload.targetPath,
          exists: true
        }
      };
    } catch {
      return {
        ok: true,
        result: {
          targetPath: payload.targetPath,
          exists: false
        }
      };
    }
  });

  ipcMain.handle("imports:inspect", async (_event, payload) => {
    const result = await runRuntimeScript("core/imports/inspectImportSource.ts", [payload.inputPath]);
    return result.ok ? ok(result, "Import source inspected.") : fail(result, "Failed to inspect import source.");
  });

  ipcMain.handle("imports:run", async (event, payload) => {
    const result = await runImportWithProgress(event.sender, payload.inputPath, payload.outputRoot || "organized_output");
    return result.ok ? ok(result, "Import source processed.") : formatImportFailure(result, "Failed to process import source.");
  });

  ipcMain.handle("imports:stop", async () => {
    if (!activeImportRun?.child || activeImportRun.child.killed) {
      return {
        ok: false,
        error: "No active import is running right now."
      };
    }

    activeImportRun.stoppedByUser = true;
    activeImportRun.webContents.send("imports:progress", {
      stage: "processing_file",
      message: "Force-stopping the active import now.",
      percent: 0,
      filesDiscovered: 0,
      completedFiles: 0,
      elapsedMs: 0,
      processingState: "writing_history"
    });

    try {
      activeImportRun.child.kill("SIGTERM");
    } catch {
      // Ignore kill errors and let the close handler settle the state.
    }

    return {
      ok: true,
      result: {
        stopped: true
      },
      message: "Import stop requested. Quantum is stopping the active import now."
    };
  });

  ipcMain.handle("imports:history", async (_event, payload = {}) => {
    const result = await runRuntimeScript("core/imports/readImportHistory.ts", [
      payload.outputRoot || "organized_output",
      String(payload.limit || 10)
    ]);
    return result.ok ? ok(result, "Import history loaded.") : fail(result, "Failed to load import history.");
  });

  ipcMain.handle("imports:history:query", async (_event, payload = {}) => {
    const args = [payload.outputRoot || "organized_output"];
    const filters = payload.filters || {};

    if (filters.vendor) args.push("--vendor", filters.vendor);
    if (filters.topic) args.push("--topic", filters.topic);
    if (filters.text) args.push("--text", filters.text);
    if (filters.from) args.push("--from", filters.from);
    if (filters.to) args.push("--to", filters.to);
    if (filters.status && filters.status !== "all") args.push("--status", filters.status);

    const result = await runRuntimeScript("core/imports/queryImportHistory.ts", args);
    return result.ok ? ok(result, "Import history query loaded.") : fail(result, "Failed to query import history.");
  });

  ipcMain.handle("imports:retrievalIndex", async (_event, payload = {}) => {
    const result = await runRuntimeScript("core/imports/readImportRetrievalIndex.ts", [
      payload.outputRoot || "organized_output"
    ]);
    return result.ok ? ok(result, "Import retrieval index loaded.") : fail(result, "Failed to load import retrieval index.");
  });

  ipcMain.handle("retrieval:savedViews:read", async (_event, payload = {}) => {
    const result = await runRuntimeScript("core/retrieval/readSavedViews.ts", [
      payload.outputRoot || "organized_output"
    ]);
    return result.ok ? ok(result, "Saved retrieval views loaded.") : fail(result, "Failed to load saved retrieval views.");
  });

  ipcMain.handle("retrieval:savedViews:save", async (_event, payload = {}) => {
    const result = await runRuntimeScript("core/retrieval/saveSavedView.ts", [
      payload.outputRoot || "organized_output",
      payload.name || "",
      JSON.stringify(payload.filters || {}),
      JSON.stringify(payload.selectedRecord || null),
      JSON.stringify(payload.selectedSegment || null)
    ]);
    return result.ok ? ok(result, "Saved retrieval view stored.") : fail(result, "Failed to store saved retrieval view.");
  });

  ipcMain.handle("retrieval:savedViews:delete", async (_event, payload = {}) => {
    const result = await runRuntimeScript("core/retrieval/deleteSavedView.ts", [
      payload.outputRoot || "organized_output",
      payload.id || ""
    ]);
    return result.ok ? ok(result, "Saved retrieval view deleted.") : fail(result, "Failed to delete saved retrieval view.");
  });

  ipcMain.handle("datasets:latestRun", async (_event, payload = {}) => {
    const result = await runRuntimeScript("core/pipeline/readLatestDatasetRun.ts", [
      payload.outputRoot || "organized_output",
      String(payload.limit || 8)
    ]);
    return result.ok ? ok(result, "Dataset summary loaded.") : fail(result, "Failed to load dataset summary.");
  });

  ipcMain.handle("datasets:preview", async (_event, payload = {}) => {
    const result = await runRuntimeScript("core/pipeline/readDatasetPreview.ts", [
      payload.outputRoot || "organized_output",
      payload.runId || "",
      payload.kind || "topic_segments",
      String(payload.limit || 25),
      String(payload.offset || 0)
    ]);
    return result.ok ? ok(result, "Dataset preview loaded.") : fail(result, "Failed to load dataset preview.");
  });

  ipcMain.handle("datasets:segmentRetrievalIndex", async (_event, payload = {}) => {
    const result = await runRuntimeScript("core/pipeline/readSegmentRetrievalIndex.ts", [
      payload.outputRoot || "organized_output"
    ]);
    return result.ok ? ok(result, "Segment retrieval index loaded.") : fail(result, "Failed to load segment retrieval index.");
  });

  ipcMain.handle("governance:listRules", async () => {
    const result = await runRuntimeScript("core/governance/listRules.ts");
    return result.ok ? ok(result, "Governance rules listed.") : fail(result, "Failed to list governance rules.");
  });

  ipcMain.handle("governance:readRule", async (_event, payload) => {
    const result = await runRuntimeScript("core/governance/readRule.ts", [payload.filePath]);
    return result.ok ? ok(result, "Governance rule loaded.") : fail(result, "Failed to read governance rule.");
  });

  ipcMain.handle("governance:writeRule", async (_event, payload) => {
    const tempPath = path.join(app.getPath("userData"), ".electron-temp-rule.json");
    const fs = require("node:fs/promises");
    await fs.mkdir(path.dirname(tempPath), { recursive: true });
    await fs.writeFile(tempPath, payload.rawText, "utf-8");

    const result = await runRuntimeScript("core/governance/writeRule.ts", [
      payload.filePath,
      "--from-file",
      tempPath
    ]);

    try { await fs.unlink(tempPath); } catch {}

    return result.ok ? ok(result, "Governance rule saved.") : fail(result, "Failed to write governance rule.");
  });

  ipcMain.handle("db:listCollections", async (_event, payload = {}) => {
    const result = await runRuntimeScript("core/db/listCollections.ts", [payload.outputRoot || "organized_output"]);
    return result.ok ? ok(result, "DB collections listed.") : fail(result, "Failed to list DB collections.");
  });

  ipcMain.handle("db:readCollection", async (_event, payload) => {
    const result = await runRuntimeScript("core/db/readCollection.ts", [
      payload.outputRoot,
      payload.tier,
      payload.collection,
      String(payload.limit || 25),
      String(payload.offset || 0)
    ]);

    return result.ok ? ok(result, "DB collection loaded.") : fail(result, "Failed to read DB collection.");
  });

  ipcMain.handle("diagnostics:run", async () => {
    const result = await runRuntimeScript("core/diagnostics/diagRunner.ts", ["organized_output"]);
    return result.ok ? ok(result, "Diagnostics completed.") : fail(result, "Failed to run diagnostics.");
  });

  ipcMain.handle("pipeline:runFile", async (_event, payload) => {
    const result = await runRuntimeScript("core/pipeline/pipeline.ts", [
      payload.inputFile,
      payload.outputRoot
    ]);

    return result.ok ? ok(result, "Single-file pipeline run completed.") : fail(result, "Failed to run pipeline.");
  });

  ipcMain.handle("batch:run", async (_event, payload = {}) => {
    const args = [];
    if (payload.inputFolder) args.push(payload.inputFolder);
    if (payload.outputRoot) args.push(payload.outputRoot);

    const result = await runRuntimeScript("core/batch/runBatch.ts", args);
    return result.ok ? ok(result, "Batch run completed.") : fail(result, "Failed to run batch.");
  });

  ipcMain.handle("batch:diag", async () => {
    const result = await runRuntimeScript("core/batch/buildBatchDiagnostics.ts", ["organized_output"]);
    return result.ok ? ok(result, "Batch diagnostics completed.") : fail(result, "Failed to build batch diagnostics.");
  });

  ipcMain.handle("batch:delta", async () => {
    const result = await runRuntimeScript("core/batch/buildBatchDelta.ts", ["organized_output"]);
    return result.ok ? ok(result, "Batch delta completed.") : fail(result, "Failed to build batch delta.");
  });

  ipcMain.handle("notifications:archive", async (_event, payload = {}) => {
    const result = await runRuntimeScript("core/notifications/readArchiveNotifications.ts", [
      payload.outputRoot || "organized_output",
      String(payload.limit || 20)
    ]);

    return result.ok ? ok(result, "Archive notifications loaded.") : fail(result, "Failed to load archive notifications.");
  });

  ipcMain.handle("archive:markdown", async (_event, payload = {}) => {
    const args = [payload.outputRoot || "organized_output"];
    if (payload.filePath) {
      args.push("--file", payload.filePath);
    }
    if (payload.includeContent) {
      args.push("--include-content");
    }
    if (payload.includeTopics === false) {
      args.push("--skip-topics");
    }

    const result = await runRuntimeScript("core/notifications/readMarkdownArchive.ts", args);
    return result.ok ? ok(result, "Markdown archive loaded.") : fail(result, "Failed to load markdown archive.");
  });

  ipcMain.handle("db:review:buildQueue", async (_event, payload = {}) => {
    const result = await runRuntimeScript("core/db/buildReviewQueue.ts", [payload.outputRoot || "organized_output"]);
    return result.ok ? ok(result, "Review queue built.") : fail(result, "Failed to build review queue.");
  });

  ipcMain.handle("db:review:decide", async (_event, payload) => {
    const result = await runRuntimeScript("core/db/reviewDecisions.ts", [
      payload.outputRoot || "organized_output",
      payload.decision,
      payload.queueKey,
      payload.reason || ""
    ]);

    return result.ok ? ok(result, "Review decision submitted.") : fail(result, "Failed to submit review decision.");
  });

  ipcMain.handle("db:promote", async (_event, payload = {}) => {
    const result = await runRuntimeScript("core/db/promoteCurated.ts", [payload.outputRoot || "organized_output"]);
    return result.ok ? ok(result, "Curated records promoted.") : fail(result, "Failed to promote curated records.");
  });

  ipcMain.handle("folders:merge", async (_event, payload = {}) => {
    const result = await runRuntimeScript("core/pipeline/mergeTopicFolders.ts", [payload.outputRoot || "organized_output"]);
    return result.ok ? ok(result, "Topic folders merged.") : fail(result, "Failed to merge topic folders.");
  });

  ipcMain.handle("purge:restore", async (_event, payload) => {
    const result = await runRuntimeScript("core/pipeline/restorePurged.ts", [
      payload.sourceFile,
      payload.outputRoot || "organized_output"
    ]);

    return result.ok ? ok(result, "Purged file restored.") : fail(result, "Failed to restore purged file.");
  });
}

async function shutdownAgent() {
  await stopAgentServer();
}

module.exports = { registerIpc, shutdownAgent };
