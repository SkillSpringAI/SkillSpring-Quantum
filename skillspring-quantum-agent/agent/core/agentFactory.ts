/**
 * Agent Factory
 * Creates a fully configured SkillSpringAgent from config files
 */

import { SkillSpringAgent } from "./agent.js";
import { loadProviderConfig, createProvider } from "../llm/providerFactory.js";
import { loadEmbeddingsConfig, createEmbeddingProvider } from "../embeddings/providerFactory.js";
import { loadVectorStoreConfig, createVectorStore } from "../vector-store/factory.js";
import type { AgentConfig } from "../types/index.js";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

interface AgentFactoryOptions {
  outputRoot?: string;
  configDir?: string;
  agentConfigPath?: string;
  llmConfigPath?: string;
  embeddingsConfigPath?: string;
  vectorStoreConfigPath?: string;
}

export interface AgentRuntime {
  agent: SkillSpringAgent;
  llm: ReturnType<typeof createProvider>;
  embeddings: ReturnType<typeof createEmbeddingProvider>;
  vectorStore: ReturnType<typeof createVectorStore>;
  config: AgentConfig;
  outputRoot: string;
}

export async function createAgentRuntime(options: AgentFactoryOptions = {}): Promise<AgentRuntime> {
  const outputRoot = options.outputRoot ? resolve(options.outputRoot) : resolve("organized_output");
  const configDir = options.configDir ? resolve(options.configDir) : new URL("../config", import.meta.url).pathname;

  // Load all configs
  const [llmConfig, embeddingsConfig, vectorStoreConfig] = await Promise.all([
    loadProviderConfig(options.llmConfigPath ?? join(configDir, "llm.config.json")),
    loadEmbeddingsConfig(options.embeddingsConfigPath ?? join(configDir, "embeddings.config.json")),
    loadVectorStoreConfig(options.vectorStoreConfigPath ?? join(configDir, "vectorStore.config.json")),
  ]);

  // Load agent config
  const agentConfigRaw = await readFile(
    options.agentConfigPath ?? join(configDir, "agent.config.json"),
    "utf-8"
  );
  const agentConfig = JSON.parse(agentConfigRaw) as AgentConfig;

  // Create providers
  const llm = createProvider(llmConfig);
  const embeddings = createEmbeddingProvider(embeddingsConfig);

  // Override vector store path to be within outputRoot
  const vectorStore = createVectorStore({
    ...vectorStoreConfig,
    sqlite: {
      ...vectorStoreConfig.sqlite,
      db_path: join(outputRoot, vectorStoreConfig.sqlite.db_path),
    },
  });

  const agent = new SkillSpringAgent({
    llm,
    embeddings,
    vectorStore,
    config: agentConfig,
    outputRoot,
  });

  return {
    agent,
    llm,
    embeddings,
    vectorStore,
    config: agentConfig,
    outputRoot,
  };
}

export async function createAgent(options: AgentFactoryOptions = {}): Promise<SkillSpringAgent> {
  const runtime = await createAgentRuntime(options);
  return runtime.agent;
}

export async function checkPrerequisites(): Promise<{
  ok: boolean;
  missing: string[];
  details: Record<string, string>;
}> {
  const missing: string[] = [];
  const details: Record<string, string> = {};

  // Check LLM provider
  try {
    const { loadProviderConfig, getFirstAvailableProvider } = await import("../llm/providerFactory.js");
    const config = await loadProviderConfig();
    const provider = await getFirstAvailableProvider(config);
    const models = await provider.listModels();
    details.llm = `${provider.name} (${models.length} models)`;
  } catch (error) {
    missing.push("LLM provider (Ollama or LM Studio)");
    details.llm = `unavailable: ${error instanceof Error ? error.message : String(error)}`;
  }

  // Check embeddings
  try {
    const { loadEmbeddingsConfig, getFirstAvailableEmbeddingProvider } = await import("../embeddings/providerFactory.js");
    const config = await loadEmbeddingsConfig();
    const provider = await getFirstAvailableEmbeddingProvider(config);
    details.embeddings = `${provider.name} (${provider.getDimensions()}d)`;
  } catch (error) {
    missing.push("Embedding provider (Ollama)");
    details.embeddings = `unavailable: ${error instanceof Error ? error.message : String(error)}`;
  }

  return {
    ok: missing.length === 0,
    missing,
    details,
  };
}
