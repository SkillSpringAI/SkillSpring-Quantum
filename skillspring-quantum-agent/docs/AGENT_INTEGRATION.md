# SkillSpring Local Agent - Integration Guide

## Electron Integration

### Architecture Overview

```
Electron Main Process
  |
  |-- Starts local agent on demand through repo-aware helpers
  |-- Exposes IPC handlers (agent:start, agent:stop, agent:health, agent:chat, agent:sessions:list, agent:sessions:create, agent:index)
  |
  V
HTTP API Server (localhost:5678)
  |
  |-- /health      (health checks)
  |-- /chat        (send messages)
  |-- /sessions    (session management)
  |-- /index       (trigger indexing)
  |
  V
Electron Renderer (React UI)
  |
  |-- preload bridge via window.skillspringDesktop.agent.*
  |-- context-aware Ask Quantum drawer
  |-- narrow deterministic command bridge before freeform explanation fallback
```

### Main Process Integration

```typescript
// electron/ipc/registerIpc.cjs
ipcMain.handle("agent:start", async (_event, payload = {}) => {
  // ensures the local HTTP agent is running for the selected output root
});

ipcMain.handle("agent:stop", async () => {
  // stops the background agent process for the current app session
});

ipcMain.handle("agent:health", async (_event, payload = {}) => {
  // checks a live server first, then falls back to a prerequisite probe
});

ipcMain.handle("agent:chat", async (_event, payload = {}) => {
  // proxies chat requests to /chat after ensuring the server is up
});

ipcMain.handle("agent:sessions:list", async (_event, payload = {}) => {
  // loads prior sessions from /sessions
});

ipcMain.handle("agent:sessions:create", async (_event, payload = {}) => {
  // creates a new chat session through /sessions POST
});

ipcMain.handle("agent:index", async (_event, payload = {}) => {
  // triggers indexing through the running server or one-shot CLI fallback
});
```

### Renderer Process Integration

```typescript
// renderer usage through preload
const health = await window.skillspringDesktop.agent.health(outputRoot);
const started = await window.skillspringDesktop.agent.start(outputRoot);
const session = await window.skillspringDesktop.agent.createSession(outputRoot, "Archive QA");
const sessions = await window.skillspringDesktop.agent.listSessions(outputRoot);
const response = await window.skillspringDesktop.agent.chat(
  outputRoot,
  session.id,
  "What have I discussed about React?"
);
await window.skillspringDesktop.agent.index(outputRoot);
```

## Current Product Boundary

As of July 5, 2026, the first assistant-facing UI behavior is intentionally narrow:

- `Ask Quantum` first tries a validated command catalog for supported requests
- supported requests route into deterministic Quantum actions such as export inspection, import start, screen navigation, output opening, retrieval search handoff, and index rebuild
- only non-command requests fall back to broader assistant explanation

This was chosen to make the assistant useful before outside beta without letting it become an unbounded shortcut around the app's evidence-driven workflow.

## Pipeline Integration

### Automatic Indexing on Import

The agent can hook into the SkillSpring pipeline to automatically index new imports:

```typescript
// In your pipeline initialization
import { initializeHooks } from "./agent/core/pipelineHooks.js";

const hooks = await initializeHooks("organized_output");

// After pipeline run completes
await hooks.onImportComplete({
  run_id: "run-2026-07-04",
  conversations_found: 25,
  segments_created: 40,
  output_root: "organized_output",
  topics: ["Engineering", "Product", "DevOps"],
  warnings: [],
  errors: [],
});
```

### Manual Indexing

```typescript
import { triggerIndexing } from "./agent/core/pipelineHooks.js";

const result = await triggerIndexing("organized_output", {
  archives: true,
  datasets: true,
});

console.log(`Indexed ${result.archives?.chunksIndexed ?? 0} archive chunks`);
console.log(`Indexed ${result.datasets?.chunksIndexed ?? 0} dataset records`);
```

## Custom Tool Registration

You can extend the agent with custom tools:

```typescript
import { SkillSpringAgent } from "./agent/core/agent.js";

// Custom tool that queries your own data source
const myCustomTool = {
  name: "query_internal_api",
  description: "Query internal API for additional context",
  parameters: {
    type: "object",
    properties: {
      endpoint: { type: "string" },
      params: { type: "object" },
    },
    required: ["endpoint"],
  },
  async execute(args, context) {
    const { endpoint } = args;
    // Your implementation
    return `Results from ${endpoint}: ...`;
  },
};

// Register via the agent's tool system
// (Requires extending the agent class or modifying the registry)
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OLLAMA_HOST` | Ollama server URL | `http://localhost:11434` |
| `SKILLSPRING_OUTPUT` | Default output root when no explicit output root is passed | `organized_output` |
| `AGENT_PORT` | API server port | `5678` |
| `AGENT_LOG_LEVEL` | Logging level | `info` |

## Testing

```bash
# Run health check
npm run agent:health

# Test single query
npm run agent:query -- "List my topics"

# Start server and test API
npm run agent:server &
curl http://localhost:5678/health

# Full integration test
tsx tests/agent/integration.test.ts
```

## Performance Monitoring

The agent exposes performance metrics via the health endpoint:

```typescript
const health = await agent.healthCheck();
console.log(`LLM: ${health.llm}`);
console.log(`Embeddings: ${health.embeddings}`);
console.log(`Vector Store: ${health.vector_store}`);
console.log(`Uptime: ${health.uptime_seconds}s`);
```

For detailed performance tracking, check the SQLite session database under the active output root, for example `<selected-output-root>/agent_store/sessions.db`.
