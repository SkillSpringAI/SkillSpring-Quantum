/**
 * LM Studio LLM Provider
 * Connects to a local LM Studio instance via OpenAI-compatible API
 */

import type { LLMProvider, LLMMessage, LLMResponse, LLMRequestOptions } from "../types/index.js";

interface LMStudioChatRequest {
  model: string;
  messages: Array<{ role: string; content: string; name?: string }>;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stream?: boolean;
  tools?: unknown[];
}

interface LMStudioChatResponse {
  choices: Array<{
    message: {
      role: string;
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: string;
        function: { name: string; arguments: string };
      }>;
    };
    finish_reason: string;
  }>;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class LMStudioProvider implements LLMProvider {
  readonly name = "lmstudio";
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
    this.baseUrl = config?.baseUrl ?? "http://localhost:1234";
    this.defaultModel = config?.defaultModel ?? "local-model";
    this.requestTimeoutMs = config?.requestTimeoutMs ?? 120_000;
    this.maxRetries = config?.maxRetries ?? 3;
    this.retryDelayMs = config?.retryDelayMs ?? 1_000;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5_000);
      const response = await fetch(`${this.baseUrl}/v1/models`, { signal: controller.signal });
      clearTimeout(timeout);
      return response.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/models`);
      if (!response.ok) throw new Error(`LM Studio list models failed: ${response.statusText}`);
      const data = await response.json() as { data?: Array<{ id: string }> };
      return (data.data ?? []).map((m) => m.id);
    } catch (error) {
      throw new Error(`Failed to list LM Studio models: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async chat(messages: LLMMessage[], options?: LLMRequestOptions): Promise<LLMResponse> {
    const model = options?.model ?? this.defaultModel;
    const body: LMStudioChatRequest = {
      model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        name: m.name,
      })),
      temperature: options?.temperature ?? 0.7,
      top_p: options?.top_p ?? 0.9,
      max_tokens: options?.max_tokens ?? options?.num_predict,
      stream: false,
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

    const result = await this.withRetry(() => this.post<LMStudioChatResponse>("/v1/chat/completions", body));
    const choice = result.choices[0];
    const msg = choice?.message;

    return {
      content: msg?.content ?? "",
      tool_calls: msg?.tool_calls?.map((tc) => ({
        id: tc.id,
        type: "function" as const,
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments,
        },
      })),
      model: result.model,
      usage: result.usage ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      done: choice?.finish_reason === "stop" || choice?.finish_reason === "tool_calls",
    };
  }

  async generate(prompt: string, options?: LLMRequestOptions): Promise<LLMResponse> {
    const messages: LLMMessage[] = [
      { role: "user", content: prompt },
    ];
    if (options?.system) {
      messages.unshift({ role: "system", content: options.system });
    }
    return this.chat(messages, options);
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
