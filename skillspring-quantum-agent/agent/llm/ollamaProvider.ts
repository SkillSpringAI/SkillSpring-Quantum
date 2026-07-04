/**
 * Ollama LLM Provider
 * Connects to a local Ollama instance for chat and generation
 */

import type { LLMProvider, LLMMessage, LLMResponse, LLMRequestOptions } from "../types/index.js";

interface OllamaChatRequest {
  model: string;
  messages: Array<{ role: string; content: string; tool_calls?: unknown[] }>;
  stream?: boolean;
  options?: Record<string, unknown>;
  tools?: unknown[];
}

interface OllamaChatResponse {
  message?: {
    role: string;
    content: string;
    tool_calls?: Array<{
      function: { name: string; arguments: string | Record<string, unknown> };
    }>;
  };
  model: string;
  done: boolean;
  prompt_eval_count?: number;
  eval_count?: number;
}

export class OllamaProvider implements LLMProvider {
  readonly name = "ollama";
  private baseUrl: string;
  private defaultModel: string;
  private requestTimeoutMs: number;
  private maxRetries: number;
  private retryDelayMs: number;

  constructor(config?: {
    baseUrl?: string;
    defaultModel?: string;
    requestTimeoutMs?: number;
    maxRetries?: number;
    retryDelayMs?: number;
  }) {
    this.baseUrl = config?.baseUrl ?? "http://localhost:11434";
    this.defaultModel = config?.defaultModel ?? "llama3.2";
    this.requestTimeoutMs = config?.requestTimeoutMs ?? 120_000;
    this.maxRetries = config?.maxRetries ?? 3;
    this.retryDelayMs = config?.retryDelayMs ?? 1_000;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5_000);
      const response = await fetch(`${this.baseUrl}/api/tags`, { signal: controller.signal });
      clearTimeout(timeout);
      return response.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) throw new Error(`Ollama list models failed: ${response.statusText}`);
      const data = await response.json() as { models?: Array<{ name: string }> };
      return (data.models ?? []).map((m) => m.name);
    } catch (error) {
      throw new Error(`Failed to list Ollama models: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async chat(messages: LLMMessage[], options?: LLMRequestOptions): Promise<LLMResponse> {
    const model = options?.model ?? this.defaultModel;
    const body: OllamaChatRequest = {
      model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}),
      })),
      stream: false,
      options: this.buildOptions(options),
    };

    if (options?.tools && options.tools.length > 0) {
      body.tools = options.tools.map((t) => ({
        type: "function",
        function: {
          name: t.function.name,
          description: t.function.description,
          parameters: t.function.parameters,
        },
      }));
    }

    const result = await this.withRetry(() => this.post<OllamaChatResponse>("/api/chat", body));
    const msg = result.message;
    const toolCalls = msg?.tool_calls?.map((tc, i) => ({
      id: `call_${i}`,
      type: "function" as const,
      function: {
        name: tc.function.name,
        arguments: typeof tc.function.arguments === "string"
          ? tc.function.arguments
          : JSON.stringify(tc.function.arguments),
      },
    }));

    return {
      content: msg?.content ?? "",
      tool_calls: toolCalls,
      model: result.model,
      usage: {
        prompt_tokens: result.prompt_eval_count ?? 0,
        completion_tokens: result.eval_count ?? 0,
        total_tokens: (result.prompt_eval_count ?? 0) + (result.eval_count ?? 0),
      },
      done: result.done,
    };
  }

  async generate(prompt: string, options?: LLMRequestOptions): Promise<LLMResponse> {
    const model = options?.model ?? this.defaultModel;
    const body = {
      model,
      prompt,
      stream: false,
      options: this.buildOptions(options),
      system: options?.system ?? undefined,
    };

    const result = await this.withRetry(() => this.post<{ response: string; model: string; done: boolean; prompt_eval_count?: number; eval_count?: number }>("/api/generate", body));

    return {
      content: result.response,
      model: result.model,
      usage: {
        prompt_tokens: result.prompt_eval_count ?? 0,
        completion_tokens: result.eval_count ?? 0,
        total_tokens: (result.prompt_eval_count ?? 0) + (result.eval_count ?? 0),
      },
      done: result.done,
    };
  }

  private buildOptions(options?: LLMRequestOptions): Record<string, unknown> {
    const opts: Record<string, unknown> = {};
    if (options?.temperature !== undefined) opts.temperature = options.temperature;
    if (options?.top_p !== undefined) opts.top_p = options.top_p;
    if (options?.top_k !== undefined) opts.top_k = options.top_k;
    if (options?.num_predict !== undefined) opts.num_predict = options.num_predict;
    if (options?.max_tokens !== undefined) opts.num_predict = options.max_tokens;
    return opts;
  }

  private async post<T>(endpoint: string, body: unknown): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }

      return await response.json() as T;
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`Request timed out after ${this.requestTimeoutMs}ms`);
      }
      throw error;
    }
  }

  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;
    for (let i = 0; i < this.maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (i < this.maxRetries - 1) {
          await this.delay(this.retryDelayMs * (i + 1));
        }
      }
    }
    throw lastError ?? new Error("Max retries exceeded");
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
