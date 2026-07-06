/**
 * LLM Provider Factory
 * Creates and configures LLM providers based on config
 */

import type { LLMProvider } from "../types/index.js";
import { OllamaProvider } from "./ollamaProvider.js";
import { LMStudioProvider } from "./lmStudioProvider.js";

interface ProviderConfig {
  default_provider: string;
  providers: Record<string, ProviderEntry>;
  fallback_behavior?: {
    on_model_not_found?: string;
  };
}

interface ProviderEntry {
  enabled: boolean;
  base_url: string;
  default_model: string;
  available_models?: string[];
  request_timeout_ms: number;
  max_retries: number;
  retry_delay_ms: number;
  default_options?: Record<string, unknown>;
}

let cachedConfig: ProviderConfig | null = null;

export async function loadProviderConfig(configPath?: string): Promise<ProviderConfig> {
  if (cachedConfig) return cachedConfig;
  const { readFile } = await import("node:fs/promises");
  const path = configPath ?? new URL("../config/llm.config.json", import.meta.url);
  const raw = await readFile(path, "utf-8");
  const parsed = JSON.parse(raw) as ProviderConfig;
  cachedConfig = parsed;
  return parsed;
}

export function createProvider(config: ProviderConfig, providerName?: string): LLMProvider {
  const name = providerName ?? config.default_provider;
  const entry = config.providers[name];

  if (!entry) {
    throw new Error(`Unknown LLM provider: ${name}. Available: ${Object.keys(config.providers).join(", ")}`);
  }

  if (!entry.enabled) {
    throw new Error(`LLM provider "${name}" is disabled in config`);
  }

  switch (name) {
    case "ollama":
      return new OllamaProvider({
        baseUrl: entry.base_url,
        defaultModel: entry.default_model,
        compatibleModels: entry.available_models,
        fallbackToFirstAvailable: config.fallback_behavior?.on_model_not_found === "fallback_to_first_available",
        requestTimeoutMs: entry.request_timeout_ms,
        maxRetries: entry.max_retries,
        retryDelayMs: entry.retry_delay_ms,
      });
    case "lmstudio":
      return new LMStudioProvider({
        baseUrl: entry.base_url,
        defaultModel: entry.default_model,
        requestTimeoutMs: entry.request_timeout_ms,
        maxRetries: entry.max_retries,
        retryDelayMs: entry.retry_delay_ms,
      });
    default:
      throw new Error(`Provider "${name}" not implemented`);
  }
}

export async function getFirstAvailableProvider(config: ProviderConfig): Promise<LLMProvider> {
  const entries = Object.entries(config.providers).filter(([, v]) => v.enabled);

  for (const [name, entry] of entries) {
    try {
      const provider = createProvider(config, name);
      if (await provider.isAvailable()) {
        return provider;
      }
    } catch {
      // try next
    }
  }

  throw new Error(
    `No LLM provider available. Checked: ${entries.map(([k]) => k).join(", ")}. ` +
      `Ensure Ollama (http://localhost:11434) or LM Studio (http://localhost:1234) is running.`
  );
}

export function clearProviderCache(): void {
  cachedConfig = null;
}
