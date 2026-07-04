# SkillSpring Local Agent - Setup Guide

The SkillSpring Local Agent is a privacy-first AI assistant that runs entirely on your local machine. It enables you to chat with your archived AI conversations using local LLMs.

## Prerequisites

### Required

- **Node.js 22+** (for the agent runtime and `node:sqlite`)
- **Ollama** (for local LLM inference and embeddings)

### Optional (alternatives to Ollama)

- **LM Studio** (alternative LLM provider)
- **LlamaFile** (alternative LLM provider)

## Installation

### 1. Install Ollama

```bash
# macOS / Linux
curl -fsSL https://ollama.com/install.sh | sh

# Windows: Download from https://ollama.com/download/windows
```

### 2. Pull Required Models

```bash
# Default chat model (lightweight, fast)
ollama pull llama3.2

# Alternative chat models
ollama pull mistral
ollama pull qwen2.5

# Embedding model (required for RAG)
ollama pull nomic-embed-text

# Alternative embedding models
ollama pull mxbai-embed-large
ollama pull snowflake-arctic-embed
```

### 3. Verify Ollama is Running

```bash
# Should return a list of models
ollama list

# Test chat
echo "Hello" | ollama run llama3.2
```

Ollama runs a local API server at `http://localhost:11434`.

## Quick Start

### Health Check

```bash
npm run agent:health
```

### Interactive Chat Mode

```bash
# Start interactive chat with your archives
npm run agent

# Or specify a custom output root
tsx skillspring-quantum-agent/agent/main.ts --output ./my_exports
```

### Single Query Mode

```bash
npm run agent:query -- "What topics have I discussed about TypeScript?"
```

### Index Existing Archives

```bash
# Index all existing archives for RAG search
npm run agent:index
```

### Start API Server

```bash
# Start HTTP API server for Electron integration
npm run agent:server -- --port 5678
```

## Configuration

All configuration files are in `agent/config/`:

### LLM Configuration (`llm.config.json`)

```json
{
  "default_provider": "ollama",
  "providers": {
    "ollama": {
      "enabled": true,
      "base_url": "http://localhost:11434",
      "default_model": "llama3.2"
    }
  }
}
```

**Key settings:**
- `default_provider`: Which LLM backend to use
- `default_model`: Which model to use by default
- `request_timeout_ms`: How long to wait for LLM responses (default: 120000ms)

### Embedding Configuration (`embeddings.config.json`)

```json
{
  "default_provider": "ollama",
  "providers": {
    "ollama": {
      "enabled": true,
      "base_url": "http://localhost:11434",
      "default_model": "nomic-embed-text"
    }
  }
}
```

### Vector Store Configuration (`vectorStore.config.json`)

```json
{
  "store_type": "sqlite",
  "sqlite": {
    "db_path": "agent_store/vector_index.db",
    "dimensions": 768,
    "distance_metric": "cosine",
    "enable_fts": true
  }
}
```

### Agent Configuration (`agent.config.json`)

```json
{
  "agent": {
    "max_conversation_history": 20,
    "context_window_tokens": 8192,
    "enable_tool_use": true,
    "enable_rag": true
  },
  "rag": {
    "top_k_default": 5,
    "max_context_chunks": 3
  },
  "tools": {
    "enabled_tools": ["search_archives", "query_datasets", "list_topics", ...]
  }
}
```

## Current Repo Path

In this repo, the agent currently lives at `skillspring-quantum-agent/agent/`.

Repo-level scripts already target that nested path, so examples should prefer the `npm run agent:*` commands above unless a future cleanup intentionally changes the package location.

## Architecture

```
skillspring-quantum-agent/agent/
|-- config/              # JSON configuration files
|-- core/                # Agent orchestrator, factory, hooks
|-- llm/                 # LLM providers (Ollama, LM Studio)
|-- embeddings/          # Embedding providers
|-- vector-store/        # SQLite vector store with FTS
|-- memory/              # Session store + working memory
|-- tools/               # Archive search, dataset query tools
|-- types/               # TypeScript type definitions
|-- main.ts              # CLI entry point
```

## How It Works

1. **Import**: SkillSpring Quantum imports and organizes your AI conversations
2. **Indexing**: The agent creates vector embeddings of your archive content
3. **Retrieval**: When you ask a question, relevant archive content is retrieved
4. **Generation**: A local LLM answers your question using the retrieved context

All processing happens locally. No data leaves your machine.

## Troubleshooting

### "No LLM provider available"

- Ensure Ollama is running: `ollama serve` or check the system tray icon
- Verify: `curl http://localhost:11434/api/tags`
- Check that you pulled the required models: `ollama list`

### "Embedding provider unavailable"

- Pull the embedding model: `ollama pull nomic-embed-text`
- Verify Ollama is running and accessible

### "Vector store errors"

- Ensure the output directory exists and is writable
- Check disk space for the SQLite database
- The vector store is created automatically on first use

### Slow responses

- Use a lighter model: `llama3.2` instead of larger models
- Reduce context window in `llm.config.json`
- Enable GPU acceleration in Ollama settings
- Reduce `rag.max_context_chunks` in `agent.config.json`

## Integration with Electron

The agent can be started as an HTTP server that the Electron UI communicates with:

```typescript
// Renderer process via preload bridge
const health = await window.skillspringDesktop.agent.health(outputRoot);
const started = await window.skillspringDesktop.agent.start(outputRoot);
const session = await window.skillspringDesktop.agent.createSession(outputRoot, "Archive QA");
const response = await window.skillspringDesktop.agent.chat(
  outputRoot,
  session.id,
  "What have I discussed about React?"
);
```

## Security & Privacy

- All LLM inference happens locally via Ollama/LM Studio
- Embeddings are generated locally
- Vector store is a local SQLite database
- No API keys or cloud services required
- No telemetry or data collection
- Conversation history stored in local SQLite

## Performance Tips

1. **Use GPU**: Configure Ollama to use GPU acceleration
2. **Model selection**: Smaller models (3B-8B parameters) are faster
3. **Batch indexing**: Index archives in batches during idle time
4. **Chunk size**: Adjust `chunk_size` in embeddings config for your content
5. **Context limits**: Reduce `context_window_tokens` for faster responses
