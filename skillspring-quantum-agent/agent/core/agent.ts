/**
 * SkillSpring Local Agent - Core Orchestrator
 * Main agent class that coordinates LLM, memory, tools, and RAG
 */

import type {
  LLMProvider,
  EmbeddingProvider,
  VectorStore,
  AgentConfig,
  AgentContext,
  AgentResponse,
  ConversationSession,
  ConversationMessage,
  ToolDefinition,
  ToolCall,
  ToolResult,
  RetrievedContext,
  LLMMessage,
  LLMRequestOptions,
} from "../types/index.js";

import { SessionStore } from "../memory/sessionStore.js";
import { WorkingMemory } from "../memory/workingMemory.js";
import { vectorSearchArchives } from "../tools/archiveTools.js";
import {
  searchArchivesTool,
  listTopicsTool,
  getConversationTool,
  summarizeTopicTool,
} from "../tools/archiveTools.js";
import {
  queryDatasetsTool,
  importStatusTool,
  runDiagnosticTool,
} from "../tools/datasetTools.js";
import { join } from "node:path";

interface AgentDependencies {
  llm: LLMProvider;
  embeddings: EmbeddingProvider;
  vectorStore: VectorStore;
  config: AgentConfig;
  outputRoot: string;
}

interface ToolRegistryEntry {
  executor: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
    execute(args: Record<string, unknown>, context: { outputRoot: string; vectorStore: VectorStore }): Promise<string>;
  };
  enabled: boolean;
}

export class SkillSpringAgent {
  private llm: LLMProvider;
  private embeddings: EmbeddingProvider;
  private vectorStore: VectorStore;
  private config: AgentConfig;
  private outputRoot: string;
  private sessionStore: SessionStore;
  private workingMemory: WorkingMemory;
  private tools: Map<string, ToolRegistryEntry> = new Map();
  private startTime: number = Date.now();

  constructor(deps: AgentDependencies) {
    this.llm = deps.llm;
    this.embeddings = deps.embeddings;
    this.vectorStore = deps.vectorStore;
    this.config = deps.config;
    this.outputRoot = deps.outputRoot;

    // Initialize memory systems
    const memoryDbPath = join(this.outputRoot, "agent_store", "sessions.db");
    this.sessionStore = new SessionStore({ dbPath: memoryDbPath });
    this.workingMemory = new WorkingMemory({
      maxItems: deps.config.memory.working_memory.max_items,
      defaultTtlSeconds: deps.config.memory.working_memory.ttl_seconds,
    });

    // Register tools
    this.registerTool(searchArchivesTool);
    this.registerTool(listTopicsTool);
    this.registerTool(getConversationTool);
    this.registerTool(summarizeTopicTool);
    this.registerTool(queryDatasetsTool);
    this.registerTool(importStatusTool);
    this.registerTool(runDiagnosticTool);
  }

  private registerTool(tool: ToolRegistryEntry["executor"]): void {
    const enabled = this.config.tools.enabled_tools.includes(tool.name);
    this.tools.set(tool.name, { executor: tool, enabled });
  }

  // ── Session Management ─────────────────────────────────────────

  createSession(title?: string): ConversationSession {
    return this.sessionStore.createSession(title);
  }

  getSession(sessionId: string): ConversationSession | null {
    return this.sessionStore.getSession(sessionId);
  }

  listSessions(limit?: number): Array<{ id: string; title: string; updated_at: string; message_count: number }> {
    return this.sessionStore.listSessions(limit);
  }

  deleteSession(sessionId: string): void {
    this.sessionStore.deleteSession(sessionId);
  }

  // ── Chat Interface ─────────────────────────────────────────────

  async chat(
    sessionId: string,
    userMessage: string,
    options?: {
      systemPromptKey?: "default" | "archive_qa" | "dataset_query" | "topic_summary" | "import_assist";
      enableRag?: boolean;
      enableTools?: boolean;
    }
  ): Promise<AgentResponse> {
    const session = this.sessionStore.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // 1. Add user message to session
    this.sessionStore.addMessage(sessionId, { role: "user", content: userMessage });

    // 2. Retrieve context if RAG enabled
    let retrievedContext: RetrievedContext[] = [];
    if (options?.enableRag ?? this.config.rag.enabled) {
      retrievedContext = await this.retrieveContext(userMessage);
    }

    // 3. Build messages for LLM
    const systemPrompt = this.getSystemPrompt(options?.systemPromptKey ?? "default", retrievedContext);
    const recentMessages = this.getRecentMessages(sessionId);

    const llmMessages: LLMMessage[] = [
      { role: "system", content: systemPrompt },
      ...recentMessages.map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      })),
    ];

    // 4. Build tool definitions for LLM
    const availableTools = this.getAvailableToolDefinitions();
    const llmOptions: LLMRequestOptions = {
      temperature: this.config.agent.response_temperature,
      tools: availableTools.length > 0 && (options?.enableTools ?? this.config.agent.enable_tool_use)
        ? availableTools
        : undefined,
    };

    // 5. Call LLM
    const llmResponse = await this.llm.chat(llmMessages, llmOptions);

    // 6. Handle tool calls if any
    let toolResults: ToolResult[] | undefined;
    if (llmResponse.tool_calls && llmResponse.tool_calls.length > 0) {
      toolResults = await this.executeToolCalls(llmResponse.tool_calls);

      // Add tool results and re-prompt
      const toolResultMessages: LLMMessage[] = [
        ...llmMessages,
        {
          role: "assistant",
          content: llmResponse.content,
          tool_calls: llmResponse.tool_calls,
        },
        ...toolResults.map((tr) => ({
          role: "tool" as const,
          content: tr.content,
          tool_call_id: tr.tool_call_id,
          name: tr.name,
        })),
      ];

      const followUpResponse = await this.llm.chat(toolResultMessages, {
        temperature: this.config.agent.response_temperature,
      });

      // Store assistant response
      this.sessionStore.addMessage(sessionId, {
        role: "assistant",
        content: followUpResponse.content,
        tool_results: toolResults,
      });

      return {
        content: followUpResponse.content,
        tool_calls: llmResponse.tool_calls,
        tool_results: toolResults,
        sources: retrievedContext,
        model: followUpResponse.model,
        usage: followUpResponse.usage,
      };
    }

    // 7. Store assistant response
    this.sessionStore.addMessage(sessionId, {
      role: "assistant",
      content: llmResponse.content,
    });

    return {
      content: llmResponse.content,
      sources: retrievedContext,
      model: llmResponse.model,
      usage: llmResponse.usage,
    };
  }

  // ── Streaming Chat (placeholder for future implementation) ───────

  async *chatStream(
    sessionId: string,
    userMessage: string,
    options?: {
      systemPromptKey?: "default" | "archive_qa" | "dataset_query" | "topic_summary" | "import_assist";
      enableRag?: boolean;
      enableTools?: boolean;
    }
  ): AsyncGenerator<{ type: "token" | "tool_call" | "tool_result" | "complete"; content: string; toolCall?: ToolCall; toolResult?: ToolResult }> {
    // For now, delegate to non-streaming and yield complete response
    const response = await this.chat(sessionId, userMessage, options);

    if (response.tool_calls) {
      for (const tc of response.tool_calls) {
        yield { type: "tool_call", content: `Using tool: ${tc.function.name}`, toolCall: tc };
      }
    }
    if (response.tool_results) {
      for (const tr of response.tool_results) {
        yield { type: "tool_result", content: tr.content, toolResult: tr };
      }
    }

    yield { type: "complete", content: response.content };
  }

  // ── RAG Context Retrieval ──────────────────────────────────────

  private async retrieveContext(query: string): Promise<RetrievedContext[]> {
    try {
      const results = await vectorSearchArchives(
        query,
        this.embeddings,
        this.vectorStore,
        this.config.rag.top_k_default
      );

      return results.map((r) => ({
        source: (r.metadata.source_path as string) ?? r.id,
        content: r.text,
        relevance_score: r.score,
        metadata: r.metadata as RetrievedContext["metadata"],
      }));
    } catch {
      return [];
    }
  }

  // ── Tool Execution ─────────────────────────────────────────────

  private getAvailableToolDefinitions(): ToolDefinition[] {
    const defs: ToolDefinition[] = [];

    for (const [name, entry] of this.tools) {
      if (!entry.enabled) continue;
      defs.push({
        type: "function",
        function: {
          name: entry.executor.name,
          description: entry.executor.description,
          parameters: entry.executor.parameters,
        },
      });
    }

    return defs;
  }

  private async executeToolCalls(toolCalls: ToolCall[]): Promise<ToolResult[]> {
    const results: ToolResult[] = [];
    const toolContext = {
      outputRoot: this.outputRoot,
      vectorStore: this.vectorStore,
    };

    for (const toolCall of toolCalls) {
      const entry = this.tools.get(toolCall.function.name);
      if (!entry || !entry.enabled) {
        results.push({
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
          content: `Tool "${toolCall.function.name}" is not available or not enabled.`,
          error: true,
        });
        continue;
      }

      try {
        let args: Record<string, unknown>;
        try {
          args = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;
        } catch {
          args = {};
        }

        const content = await entry.executor.execute(args, toolContext);
        results.push({
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
          content,
        });
      } catch (error) {
        results.push({
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
          content: `Error: ${error instanceof Error ? error.message : String(error)}`,
          error: true,
        });
      }
    }

    return results;
  }

  // ── System Prompt Management ───────────────────────────────────

  private getSystemPrompt(key: string, context: RetrievedContext[]): string {
    // Import system prompts from config
    const prompts: Record<string, string> = {
      default: this.loadPromptFromConfig("default"),
      archive_qa: this.loadPromptFromConfig("archive_qa"),
      dataset_query: this.loadPromptFromConfig("dataset_query"),
      topic_summary: this.loadPromptFromConfig("topic_summary"),
      import_assist: this.loadPromptFromConfig("import_assist"),
    };

    const basePrompt = prompts[key] ?? prompts.default;

    if (context.length > 0) {
      const contextText = context
        .map((c, i) => `[Context ${i + 1}] Relevance: ${(c.relevance_score * 100).toFixed(1)}%\nSource: ${c.source}\n${c.content}`)
        .join("\n\n---\n\n");

      return `${basePrompt}\n\n## Retrieved Context\n\nThe following relevant context was found in the user's archives:\n\n${contextText}\n\nUse this context to answer the user's question. If the context doesn't contain the answer, say so honestly.`;
    }

    return basePrompt;
  }

  private loadPromptFromConfig(key: string): string {
    // Simple prompts - in production these would be loaded from llm.config.json
    const defaults: Record<string, string> = {
      default: "You are the SkillSpring Local Agent, a privacy-first AI assistant that helps users explore their archived AI conversations and datasets. You run entirely on the user's local machine. Answer questions based on the retrieved context. If you don't have enough information, say so honestly. Always respect user privacy.",
      archive_qa: "You are analyzing archived AI conversations. Use the provided conversation context to answer the user's question. Cite specific conversations or topics when relevant. Be concise and accurate.",
      dataset_query: "You are analyzing a structured dataset of AI conversations. Use the provided dataset records to answer analytical questions. Provide specific numbers, patterns, and insights when available.",
      topic_summary: "You are summarizing topics from archived conversations. Create clear, structured summaries that capture key themes, decisions, and knowledge. Highlight important patterns.",
      import_assist: "You are helping the user import and process AI conversation exports. Guide them through the import flow, explain options, and help troubleshoot issues.",
    };

    return defaults[key] ?? defaults.default;
  }

  // ── Message Management ─────────────────────────────────────────

  private getRecentMessages(sessionId: string): ConversationMessage[] {
    const maxMessages = this.config.memory.short_term.max_messages;
    return this.sessionStore.getMessages(sessionId, maxMessages);
  }

  // ── Health Check ───────────────────────────────────────────────

  async healthCheck(): Promise<{
    llm: string;
    embeddings: string;
    vector_store: string;
    sessions: string;
    uptime_seconds: number;
  }> {
    const llmAvailable = await this.llm.isAvailable();
    const embeddingsAvailable = await this.embeddings.isAvailable();
    const stats = (this.vectorStore as unknown as { getStats?: () => { totalEmbeddings: number } }).getStats?.();

    return {
      llm: llmAvailable ? "ok" : "unavailable",
      embeddings: embeddingsAvailable ? "ok" : "unavailable",
      vector_store: stats ? `ok (${stats.totalEmbeddings} embeddings)` : "ok",
      sessions: "ok",
      uptime_seconds: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }

  // ── Cleanup ────────────────────────────────────────────────────

  async close(): Promise<void> {
    await this.sessionStore.close();
    await this.vectorStore.close();
  }
}
