# SkillSpring Local Agent - Integration Guide

## Electron Integration

### Architecture Overview

```
Electron Main Process
  |
  |-- Spawns Agent Server (tsx agent/main.ts --server)
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
  |-- fetch('/chat') for queries
  |-- fetch('/sessions') for history
  |-- fetch('/health') for status
```

### Main Process Integration

```typescript
// electron/main.ts
import { app, BrowserWindow, ipcMain } from "electron";
import { spawn, ChildProcess } from "child_process";
import { join } from "path";

let agentProcess: ChildProcess | null = null;

function startAgentServer(outputRoot: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const agentPath = join(__dirname, "../agent/main.ts");
    agentProcess = spawn("tsx", [agentPath, "--server", "--output", outputRoot], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let output = "";
    agentProcess.stdout?.on("data", (data) => {
      output += data.toString();
      if (output.includes("running on")) {
        const match = output.match(/:(\d+)/);
        resolve(parseInt(match?.[1] ?? "5678", 10));
      }
    });

    agentProcess.stderr?.on("data", (data) => {
      console.error(`[Agent] ${data}`);
    });

    setTimeout(() => reject(new Error("Agent startup timeout")), 30000);
  });
}

// IPC handlers for renderer
ipcMain.handle("agent:health", async () => {
  const res = await fetch("http://localhost:5678/health");
  return res.json();
});

ipcMain.handle("agent:chat", async (_, sessionId: string, message: string) => {
  const res = await fetch("http://localhost:5678/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, message }),
  });
  return res.json();
});

ipcMain.handle("agent:sessions", async () => {
  const res = await fetch("http://localhost:5678/sessions");
  return res.json();
});

// Start agent on app ready
app.whenReady().then(async () => {
  const port = await startAgentServer("organized_output");
  console.log(`Agent running on port ${port}`);
  createWindow();
});

// Cleanup on quit
app.on("before-quit", () => {
  agentProcess?.kill();
});
```

### Renderer Process Integration

```typescript
// ui app components
const API_BASE = "http://localhost:5678";

export class AgentClient {
  async health(): Promise<AgentHealth> {
    const res = await fetch(`${API_BASE}/health`);
    return res.json();
  }

  async chat(sessionId: string, message: string): Promise<ChatResponse> {
    const res = await fetch(`${API_BASE}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, message }),
    });
    return res.json();
  }

  async createSession(title?: string): Promise<{ id: string }> {
    const res = await fetch(`${API_BASE}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    const data = await res.json();
    return data.session;
  }

  async listSessions(): Promise<Session[]> {
    const res = await fetch(`${API_BASE}/sessions`);
    const data = await res.json();
    return data.sessions;
  }

  async triggerIndex(): Promise<void> {
    await fetch(`${API_BASE}/index`, { method: "POST" });
  }
}

// React hook example
function useAgentChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const client = useMemo(() => new AgentClient(), []);

  const sendMessage = async (content: string) => {
    setIsLoading(true);
    try {
      const response = await client.chat(sessionId, content);
      setMessages(prev => [...prev,
        { role: "user", content },
        { role: "assistant", content: response.response, sources: response.sources }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return { messages, sendMessage, isLoading };
}
```

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
| `SKILLSPRING_OUTPUT` | Default output root | `organized_output` |
| `AGENT_PORT` | API server port | `5678` |
| `AGENT_LOG_LEVEL` | Logging level | `info` |

## Testing

```bash
# Run health check
tsx agent/main.ts --health

# Test single query
tsx agent/main.ts --query "List my topics"

# Start server and test API
tsx agent/main.ts --server &
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

For detailed performance tracking, check the SQLite session database at `organized_output/agent_store/sessions.db`.
