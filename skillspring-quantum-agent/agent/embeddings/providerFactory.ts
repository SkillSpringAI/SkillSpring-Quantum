/**
 * Embedding Provider Factory
 */

import type { EmbeddingProvider } from "../types/index.js";
import { OllamaEmbeddingProvider } from "./ollamaEmbeddings.js";

interface EmbeddingsConfig {
  default_provider: string;
  providers: Record<string, EmbeddingsProviderEntry>;
  indexing: {
    chunk_size: number;
    chunk_overlap: number;
    index_conversations_on_import: boolean;
    index_archives_on_creation: boolean;
    index_batch_size: number;
  };
}

interface EmbeddingsProviderEntry {
  enabled: boolean;
  base_url?: string;
  default_model?: string;
  embedding_dimensions?: number;
  request_timeout_ms?: number;
  batch_size?: number;
  normalize?: boolean;
  embed_endpoint?: string;
}

let cachedConfig: EmbeddingsConfig | null = null;

export async function loadEmbeddingsConfig(configPath?: string): Promise<EmbeddingsConfig> {
  if (cachedConfig) return cachedConfig;
  const { readFile } = await import("node:fs/promises");
  const path = configPath ?? new URL("../config/embeddings.config.json", import.meta.url);
  const raw = await readFile(path, "utf-8");
  const parsed = JSON.parse(raw) as EmbeddingsConfig;
  cachedConfig = parsed;
  return parsed;
}

export function createEmbeddingProvider(
  config: EmbeddingsConfig,
  providerName?: string
): EmbeddingProvider {
  const name = providerName ?? config.default_provider;
  const entry = config.providers[name];

  if (!entry) {
    throw new Error(`Unknown embedding provider: ${name}`);
  }

  if (!entry.enabled) {
    throw new Error(`Embedding provider "${name}" is disabled`);
  }

  switch (name) {
    case "ollama":
      return new OllamaEmbeddingProvider({
        baseUrl: entry.base_url,
        model: entry.default_model,
        dimensions: entry.embedding_dimensions,
        requestTimeoutMs: entry.request_timeout_ms,
        batchSize: entry.batch_size,
        normalize: entry.normalize,
      });
    case "lmstudio": {
      // LM Studio shares Ollama-compatible embedding interface
      return new OllamaEmbeddingProvider({
        baseUrl: entry.base_url ?? "http://localhost:1234",
        model: entry.default_model ?? "local-model",
        dimensions: entry.embedding_dimensions ?? 768,
        requestTimeoutMs: entry.request_timeout_ms ?? 30_000,
        batchSize: entry.batch_size ?? 16,
        normalize: entry.normalize ?? true,
      });
    }
    default:
      throw new Error(`Embedding provider "${name}" not implemented`);
  }
}

export async function getFirstAvailableEmbeddingProvider(
  config: EmbeddingsConfig
): Promise<EmbeddingProvider> {
  const entries = Object.entries(config.providers).filter(([, v]) => v.enabled);

  for (const [name, entry] of entries) {
    try {
      const provider = createEmbeddingProvider(config, name);
      if (await provider.isAvailable()) {
        return provider;
      }
    } catch {
      // try next
    }
  }

  throw new Error(
    `No embedding provider available. Checked: ${entries.map(([k]) => k).join(", ")}`
  );
}

export function clearEmbeddingCache(): void {
  cachedConfig = null;
}
