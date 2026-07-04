/**
 * SkillSpring Local Agent - Type Definitions
 * Shared types for the local AI agent system
 */

// ── LLM Provider Types ───────────────────────────────────────────

export interface LLMMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface LLMRequestOptions {
  model?: string;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  max_tokens?: number;
  num_predict?: number;
  stream?: boolean;
  system?: string;
  tools?: ToolDefinition[];
}

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface LLMResponse {
  content: string;
  tool_calls?: ToolCall[];
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  done: boolean;
}

export interface LLMProvider {
  name: string;
  chat(messages: LLMMessage[], options?: LLMRequestOptions): Promise<LLMResponse>;
  generate(prompt: string, options?: LLMRequestOptions): Promise<LLMResponse>;
  listModels(): Promise<string[]>;
  isAvailable(): Promise<boolean>;
}

// ── Embedding Types ──────────────────────────────────────────────

export interface EmbeddingProvider {
  name: string;
  embed(texts: string[]): Promise<number[][]>;
  embedQuery(text: string): Promise<number[]>;
  getDimensions(): number;
  isAvailable(): Promise<boolean>;
}

export interface EmbeddingRecord {
  id: string;
  vector: number[];
  text: string;
  metadata: EmbeddingMetadata;
  created_at: string;
}

export interface EmbeddingMetadata {
  source_type: "conversation" | "archive" | "dataset" | "topic_summary" | "import_log";
  source_path?: string;
  conversation_id?: string;
  topic?: string;
  vendor?: string;
  date_range?: { start: string; end: string };
  chunk_index?: number;
  total_chunks?: number;
  [key: string]: unknown;
}

// ── Vector Store Types ───────────────────────────────────────────

export interface VectorStore {
  upsert(records: EmbeddingRecord[]): Promise<void>;
  search(query: number[], topK?: number, filter?: MetadataFilter): Promise<SearchResult[]>;
  delete(ids: string[]): Promise<void>;
  getById(id: string): Promise<EmbeddingRecord | null>;
  hybridSearch(query: number[], queryText: string, topK?: number, filter?: MetadataFilter): Promise<SearchResult[]>;
  close(): Promise<void>;
}

export interface SearchResult {
  id: string;
  score: number;
  text: string;
  metadata: EmbeddingMetadata;
}

export interface MetadataFilter {
  source_type?: string;
  topic?: string;
  vendor?: string;
  conversation_id?: string;
  date_range?: { start: string; end: string };
  [key: string]: unknown;
}

// ── Memory Types ─────────────────────────────────────────────────

export interface ConversationMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  tool_calls?: ToolCall[];
  tool_results?: ToolResult[];
}

export interface ToolResult {
  tool_call_id: string;
  name: string;
  content: string;
  error?: boolean;
}

export interface ConversationSession {
  id: string;
  title: string;
  messages: ConversationMessage[];
  created_at: string;
  updated_at: string;
  metadata: SessionMetadata;
}

export interface SessionMetadata {
  topic_focus?: string;
  tools_used: string[];
  total_tokens_used: number;
  message_count: number;
}

export interface MemorySummary {
  id: string;
  session_id: string;
  summary_text: string;
  key_facts: string[];
  topics_covered: string[];
  created_at: string;
}

export interface WorkingMemoryItem {
  key: string;
  value: string;
  category: "fact" | "preference" | "context" | "task";
  expires_at?: string;
  created_at: string;
}

// ── Agent Types ──────────────────────────────────────────────────

export interface AgentConfig {
  agent: {
    name: string;
    max_conversation_history: number;
    context_window_tokens: number;
    response_temperature: number;
    enable_tool_use: boolean;
    enable_memory: boolean;
    enable_rag: boolean;
  };
  memory: {
    short_term: { max_messages: number; token_budget: number };
    long_term: { enabled: boolean; storage: string; summarization_trigger: number; max_stored_summaries: number };
    working_memory: { enabled: boolean; max_items: number; ttl_seconds: number };
  };
  rag: {
    enabled: boolean;
    top_k_default: number;
    context_chunk_size: number;
    max_context_chunks: number;
    include_metadata: boolean;
    include_source_links: boolean;
  };
  tools: {
    enabled_tools: string[];
    tool_timeout_ms: number;
    max_tool_calls_per_turn: number;
  };
  logging: {
    level: string;
    log_file: string;
    max_log_size_mb: number;
    max_log_files: number;
  };
}

export interface AgentContext {
  session: ConversationSession;
  retrievedContext: RetrievedContext[];
  workingMemory: WorkingMemoryItem[];
  availableTools: ToolDefinition[];
}

export interface RetrievedContext {
  source: string;
  content: string;
  relevance_score: number;
  metadata: EmbeddingMetadata;
}

export interface AgentResponse {
  content: string;
  tool_calls?: ToolCall[];
  tool_results?: ToolResult[];
  sources?: RetrievedContext[];
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// ── Tool Types ───────────────────────────────────────────────────

export interface ToolContext {
  outputRoot: string;
  vectorStore: VectorStore;
  dbPath?: string;
}

export interface ToolExecutor {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute(args: Record<string, unknown>, context: ToolContext): Promise<string>;
}

// ── Pipeline Integration Types ───────────────────────────────────

export interface AgentPipelineHook {
  onImportComplete?(importResult: ImportResult): Promise<void>;
  onArchiveCreated?(archivePath: string, topics: string[]): Promise<void>;
  onDatasetExported?(datasetPath: string, manifest: unknown): Promise<void>;
}

export interface ImportResult {
  run_id: string;
  files_processed: number;
  conversations_found: number;
  segments_created: number;
  output_root: string;
  topics: string[];
  warnings: string[];
  errors: string[];
}

// ── Health / Diagnostics Types ───────────────────────────────────

export interface AgentHealthCheck {
  llm_provider: "ok" | "degraded" | "unavailable";
  embedding_provider: "ok" | "degraded" | "unavailable";
  vector_store: "ok" | "degraded" | "unavailable";
  memory_store: "ok" | "degraded" | "unavailable";
  details: Record<string, unknown>;
}

export interface AgentDiagnostics {
  agent_version: string;
  config_loaded: boolean;
  llm_provider: string;
  embedding_provider: string;
  vector_store: string;
  memory_store: string;
  indexed_documents: number;
  indexed_conversations: number;
  sessions_count: number;
  last_error?: string;
  uptime_seconds: number;
}
