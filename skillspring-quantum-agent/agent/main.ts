#!/usr/bin/env node
/**
 * SkillSpring Local Agent - Main Entry Point
 * CLI interface for interacting with the local agent
 *
 * Usage:
 *   tsx agent/main.ts                    # Interactive chat
 *   tsx agent/main.ts --index            # Index existing archives
 *   tsx agent/main.ts --health           # Check system health
 *   tsx agent/main.ts --query "..."      # Single query mode
 *   tsx agent/main.ts --server           # Start API server
 */

import { createAgent, createAgentRuntime, checkPrerequisites } from "./core/agentFactory.js";
import { indexArchives, indexDataset } from "./core/indexer.js";

interface CLIOptions {
  outputRoot: string;
  index: boolean;
  health: boolean;
  query?: string;
  server: boolean;
  session?: string;
  model?: string;
  port: number;
  help: boolean;
}

function parseArgs(argv: string[]): CLIOptions {
  const args = argv.slice(2);
  const options: CLIOptions = {
    outputRoot: "organized_output",
    index: false,
    health: false,
    server: false,
    port: 5678,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--index":
        options.index = true;
        break;
      case "--health":
        options.health = true;
        break;
      case "--query":
        options.query = args[++i];
        break;
      case "--server":
        options.server = true;
        break;
      case "--output":
      case "-o":
        options.outputRoot = args[++i];
        break;
      case "--session":
        options.session = args[++i];
        break;
      case "--model":
        options.model = args[++i];
        break;
      case "--port":
        options.port = parseInt(args[++i], 10);
        break;
      case "--help":
      case "-h":
        options.help = true;
        break;
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`
SkillSpring Local Agent v1.0.0

Usage: tsx agent/main.ts [options]

Options:
  --index              Index existing archives into vector store
  --health             Check system health and prerequisites
  --query "text"       Single query mode (non-interactive)
  --server             Start HTTP API server
  --output, -o PATH    Set output root (default: organized_output)
  --session ID         Resume existing session
  --model NAME         Override default LLM model
  --port NUMBER        Server port (default: 5678)
  --help, -h           Show this help

Examples:
  tsx agent/main.ts --health
  tsx agent/main.ts --index
  tsx agent/main.ts --query "What topics have I discussed about TypeScript?"
  tsx agent/main.ts --server --port 5678
`);
}

async function runHealthCheck(): Promise<void> {
  console.log("Checking prerequisites...\n");
  const check = await checkPrerequisites();

  if (check.ok) {
    console.log("All systems operational");
  } else {
    console.log("Missing dependencies:");
    for (const item of check.missing) {
      console.log(`  - ${item}`);
    }
  }

  console.log("\nDetails:");
  for (const [key, value] of Object.entries(check.details)) {
    console.log(`  ${key}: ${value}`);
  }
}

async function runIndexing(options: CLIOptions): Promise<void> {
  console.log("Indexing archives...\n");
  const runtime = await createAgentRuntime({ outputRoot: options.outputRoot });

  try {
    const archiveResult = await indexArchives(
      options.outputRoot,
      runtime.embeddings,
      runtime.vectorStore
    );
    const datasetResult = await indexDataset(
      options.outputRoot,
      runtime.embeddings,
      runtime.vectorStore
    );
    const health = await runtime.agent.healthCheck();

    console.log(`Archive indexing: ${JSON.stringify(archiveResult, null, 2)}`);
    console.log(`Dataset indexing: ${JSON.stringify(datasetResult, null, 2)}`);
    console.log(`Health: ${JSON.stringify(health, null, 2)}`);
    console.log("\nDone. Use --query or interactive mode to chat with your archives.");
  } finally {
    await runtime.agent.close();
  }
}

async function runQuery(options: CLIOptions): Promise<void> {
  if (!options.query) return;

  const agent = await createAgent({ outputRoot: options.outputRoot });

  const session = options.session
    ? agent.getSession(options.session)
    : agent.createSession("CLI Query");

  if (!session) {
    console.error(`Session not found: ${options.session}`);
    process.exit(1);
  }

  console.log(`Query: ${options.query}\n`);
  const response = await agent.chat(session.id, options.query);
  console.log(response.content);

  if (response.sources && response.sources.length > 0) {
    console.log(`\n---\nSources (${response.sources.length}):`);
    for (const source of response.sources) {
      console.log(`  - ${source.source} (score: ${(source.relevance_score * 100).toFixed(1)}%)`);
    }
  }
}

async function runInteractive(options: CLIOptions): Promise<void> {
  const readline = await import("node:readline");
  const agent = await createAgent({ outputRoot: options.outputRoot });

  const session = agent.createSession("Interactive Session");
  console.log(`\nSkillSpring Local Agent`);
  console.log(`Session: ${session.id}`);
  console.log(`Type 'exit' or 'quit' to end.\n`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const askQuestion = () => {
    rl.question("> ", async (input) => {
      const trimmed = input.trim();
      if (trimmed === "" || trimmed === "exit" || trimmed === "quit") {
        rl.close();
        await agent.close();
        process.exit(0);
      }

      try {
        const response = await agent.chat(session.id, trimmed);
        console.log(`\n${response.content}\n`);
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      }

      askQuestion();
    });
  };

  askQuestion();
}

async function runServer(options: CLIOptions): Promise<void> {
  // HTTP API server for Electron integration
  const { createServer } = await import("node:http");
  const { parse } = await import("node:url");

  const runtime = await createAgentRuntime({ outputRoot: options.outputRoot });
  const agent = runtime.agent;
  let indexingPromise: Promise<{
    archives: Awaited<ReturnType<typeof indexArchives>>;
    datasets: Awaited<ReturnType<typeof indexDataset>>;
  }> | null = null;

  async function triggerIndexingJob() {
    if (!indexingPromise) {
      indexingPromise = (async () => {
        const archives = await indexArchives(options.outputRoot, runtime.embeddings, runtime.vectorStore);
        const datasets = await indexDataset(options.outputRoot, runtime.embeddings, runtime.vectorStore);
        return { archives, datasets };
      })().finally(() => {
        indexingPromise = null;
      });
    }

    return indexingPromise;
  }

  const server = createServer(async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(200);
      res.end();
      return;
    }

    const url = parse(req.url ?? "/", true);

    try {
      switch (url.pathname) {
        case "/health": {
          const health = await agent.healthCheck();
          res.writeHead(200);
          res.end(JSON.stringify(health));
          return;
        }

        case "/chat": {
          if (req.method !== "POST") {
            res.writeHead(405);
            res.end(JSON.stringify({ error: "Method not allowed" }));
            return;
          }

          const body = await readBody(req);
          const { session_id, message, system_prompt } = JSON.parse(body);

          let session = session_id ? agent.getSession(session_id) : null;
          if (!session) {
            session = agent.createSession();
          }

          const response = await agent.chat(session.id, message, {
            systemPromptKey: system_prompt ?? "default",
          });

          res.writeHead(200);
          res.end(JSON.stringify({
            session_id: session.id,
            response: response.content,
            sources: response.sources,
            model: response.model,
            usage: response.usage,
          }));
          return;
        }

        case "/sessions": {
          if (req.method === "GET") {
            const sessions = agent.listSessions();
            res.writeHead(200);
            res.end(JSON.stringify({ sessions }));
            return;
          }

          if (req.method === "POST") {
            const body = await readBody(req);
            const { title } = JSON.parse(body);
            const session = agent.createSession(title);
            res.writeHead(201);
            res.end(JSON.stringify({ session }));
            return;
          }

          res.writeHead(405);
          res.end(JSON.stringify({ error: "Method not allowed" }));
          return;
        }

        case "/index": {
          if (req.method !== "POST") {
            res.writeHead(405);
            res.end(JSON.stringify({ error: "Method not allowed" }));
            return;
          }

          void triggerIndexingJob().catch((error) => {
            console.error(`Indexing failed: ${error instanceof Error ? error.message : String(error)}`);
          });

          res.writeHead(202);
          res.end(JSON.stringify({ status: indexingPromise ? "indexing started" : "idle" }));
          return;
        }

        default: {
          res.writeHead(404);
          res.end(JSON.stringify({ error: "Not found" }));
          return;
        }
      }
    } catch (error) {
      res.writeHead(500);
      res.end(JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  });

  server.listen(options.port, () => {
    console.log(`Agent API server running on http://localhost:${options.port}`);
    console.log(`Endpoints:`);
    console.log(`  GET  /health        - Health check`);
    console.log(`  POST /chat          - Send a message`);
    console.log(`  GET  /sessions      - List sessions`);
    console.log(`  POST /sessions      - Create session`);
    console.log(`  POST /index         - Trigger indexing`);
  });

  server.on("close", () => {
    void agent.close();
  });
}

function readBody(req: import("node:http").IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

// ── Main ─────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const options = parseArgs(process.argv);

  if (options.help) {
    printHelp();
    return;
  }

  if (options.health) {
    await runHealthCheck();
    return;
  }

  if (options.index) {
    await runIndexing(options);
    return;
  }

  if (options.query) {
    await runQuery(options);
    return;
  }

  if (options.server) {
    await runServer(options);
    return;
  }

  // Default: interactive mode
  await runInteractive(options);
}

main().catch((error) => {
  console.error(`Fatal error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
