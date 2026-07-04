# SkillSpring Local Agent - API Reference

## Programmatic API

### Creating an Agent

```typescript
import { createAgent } from "./agent/core/agentFactory.js";

const agent = await createAgent({
  outputRoot: "organized_output",  // Or any selected SkillSpring output directory
  configDir: "./agent/config",     // Config directory (optional)
});
```

### Health Check

```typescript
const health = await agent.healthCheck();
console.log(health);
// {
//   llm: "ok",
//   embeddings: "ok",
//   vector_store: "ok (1523 embeddings)",
//   sessions: "ok",
//   uptime_seconds: 3600
// }
```

### Session Management

```typescript
// Create a new session
const session = agent.createSession("My Archive Chat");

// List sessions
const sessions = agent.listSessions(10);

// Get session
const existing = agent.getSession(session.id);

// Delete session
agent.deleteSession(session.id);
```

### Chat Interface

```typescript
// Simple chat
const response = await agent.chat(session.id, "What topics have I discussed?");
console.log(response.content);

// With options
const response = await agent.chat(session.id, "Analyze my TypeScript conversations", {
  systemPromptKey: "archive_qa",  // Use archive-specific prompt
  enableRag: true,                // Enable retrieval-augmented generation
  enableTools: true,              // Allow tool use
});

// Response includes sources
for (const source of response.sources ?? []) {
  console.log(`Source: ${source.source} (relevance: ${source.relevance_score})`);
}
```

### Streaming Chat

```typescript
const stream = agent.chatStream(session.id, "Tell me about...");

for await (const chunk of stream) {
  switch (chunk.type) {
    case "token":
      process.stdout.write(chunk.content);
      break;
    case "tool_call":
      console.log(`\n[Tool: ${chunk.toolCall?.function.name}]`);
      break;
    case "complete":
      console.log("\n[Done]");
      break;
  }
}
```

## HTTP API (Server Mode)

Start the server:

```bash
npm run agent:server -- --port 5678
```

### Endpoints

#### GET /health

Returns system health status.

```bash
curl http://localhost:5678/health
```

```json
{
  "llm": "ok",
  "embeddings": "ok",
  "vector_store": "ok (1523 embeddings)",
  "sessions": "ok",
  "uptime_seconds": 3600
}
```

#### POST /chat

Send a message to the agent.

```bash
curl -X POST http://localhost:5678/chat \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "optional-existing-session-id",
    "message": "What have I discussed about React?",
    "system_prompt": "archive_qa"
  }'
```

```json
{
  "session_id": "session-1234567890-abc123",
  "response": "Based on your archives, you've discussed React in...",
  "sources": [
    {
      "source": "archive/Engineering/react-discussion-2026-06-15.md",
      "relevance_score": 0.92
    }
  ],
  "model": "llama3.2",
  "usage": {
    "prompt_tokens": 1250,
    "completion_tokens": 180,
    "total_tokens": 1430
  }
}
```

#### GET /sessions

List all conversation sessions.

```bash
curl http://localhost:5678/sessions
```

```json
{
  "sessions": [
    {
      "id": "session-1234567890-abc123",
      "title": "Archive QA",
      "updated_at": "2026-07-04T10:00:00.000Z",
      "message_count": 12
    }
  ]
}
```

#### POST /sessions

Create a new session.

```bash
curl -X POST http://localhost:5678/sessions \
  -H "Content-Type: application/json" \
  -d '{"title": "New Chat"}'
```

```json
{
  "session": {
    "id": "session-1234567890-xyz789",
    "title": "New Chat",
    "messages": [],
    "created_at": "2026-07-04T10:00:00.000Z",
    "updated_at": "2026-07-04T10:00:00.000Z"
  }
}
```

#### POST /index

Trigger archive indexing.

```bash
curl -X POST http://localhost:5678/index
```

```json
{
  "status": "indexing started"
}
```

## Available Tools

The agent has built-in tools that can be used during conversations:

| Tool | Description |
|------|-------------|
| `search_archives` | Search archived conversations by keyword/topic |
| `list_topics` | List all available topic folders |
| `get_conversation` | Retrieve a full conversation by filename |
| `summarize_topic` | Summarize conversations within a topic |
| `query_datasets` | Query structured dataset JSONL files |
| `import_status` | Check status of recent imports |
| `run_diagnostic` | Run system diagnostics |

Tools are automatically invoked by the LLM when relevant to the user's question.

## System Prompt Keys

| Key | Use Case |
|-----|----------|
| `default` | General purpose chat |
| `archive_qa` | Question answering about archives |
| `dataset_query` | Analytical queries on datasets |
| `topic_summary` | Summarizing topic contents |
| `import_assist` | Helping with import workflows |

## Types

```typescript
import type {
  AgentResponse,
  ConversationSession,
  ConversationMessage,
  RetrievedContext,
  AgentHealthCheck,
  ToolCall,
  ToolResult,
} from "./agent/types/index.js";
```

## Error Handling

All methods throw on failure. Common errors:

- `Session not found: ${sessionId}` - Invalid session ID
- `No LLM provider available` - Ollama/LM Studio not running
- `Embedding provider unavailable` - Ollama not running or model not pulled
- `Vector store error` - Database file issue

Always wrap calls in try/catch for production use.
