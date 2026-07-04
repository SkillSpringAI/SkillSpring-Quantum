# SkillSpring Local Agent

A privacy-first, fully local AI agent for SkillSpring Quantum. Chat with your archived AI conversations using on-device LLMs. No cloud. No API keys. Private.

## What It Does

- **Archive Q&A**: Ask questions about your past AI conversations
- **Topic Analysis**: Summarize and explore conversation topics
- **Dataset Queries**: Query structured conversation datasets
- **Import Assistance**: Get help with import workflows and diagnostics
- **Local-Only Operation**: All processing stays on your machine

## Prerequisites

- Node.js 20+ (for `node:sqlite`)
- [Ollama](https://ollama.com) installed and running
- Required models pulled:
  ```bash
  ollama pull llama3.2      # Chat model
  ollama pull nomic-embed-text  # Embeddings
  ```

## Quick Start

```bash
# Check system health
tsx skillspring-quantum-agent/agent/main.ts --health

# Interactive chat mode
tsx skillspring-quantum-agent/agent/main.ts

# Single query
tsx skillspring-quantum-agent/agent/main.ts --query "What TypeScript topics have I discussed?"

# Start API server
tsx skillspring-quantum-agent/agent/main.ts --server

# Index existing archives
tsx skillspring-quantum-agent/agent/main.ts --index
```

## Configuration

All config files are in `agent/config/`:

| File | Purpose |
|------|---------|
| `llm.config.json` | LLM provider settings (Ollama, LM Studio) |
| `embeddings.config.json` | Embedding model configuration |
| `vectorStore.config.json` | SQLite vector store settings |
| `agent.config.json` | Agent behavior, RAG, tools |
| `agentManifest.json` | Agent metadata and capabilities |

## Architecture

```
agent/
|-- config/           # JSON configuration
|-- core/             # Agent orchestrator, factory, indexer
|-- llm/              # LLM providers (Ollama, LM Studio)
|-- embeddings/       # Embedding providers
|-- vector-store/     # SQLite vector storage with FTS
|-- memory/           # Session store + working memory
|-- tools/            # Built-in tools (search, query, summarize)
|-- types/            # TypeScript definitions
|-- main.ts           # CLI entry point
```

## Privacy

- LLM inference via local Ollama instance
- Embeddings generated locally
- Vector store: local SQLite database
- Session history: local SQLite database
- Zero external API calls
- Zero telemetry

## Documentation

- [Setup Guide](../docs/AGENT_SETUP.md) - Detailed installation and configuration
- [API Reference](../docs/AGENT_API.md) - Programmatic API and HTTP endpoints
- [Integration Guide](../docs/AGENT_INTEGRATION.md) - Electron and pipeline integration

## Repo Layout Note

This package currently lives under `skillspring-quantum-agent/agent/` inside the main SkillSpring Quantum repo.

If the repo later normalizes this into a top-level `agent/` directory, command examples can be shortened again. Until then, prefer the explicit nested path in scripts and integration notes.

## License

Same as SkillSpring Quantum (MIT)
