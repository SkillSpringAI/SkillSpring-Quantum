/**
 * Ollama Embedding Provider
 * Generates text embeddings via local Ollama instance
 */

import type { EmbeddingProvider } from "../types/index.js";
import { isModelMissingError, selectBestAvailableModel } from "../core/modelSelection.js";

interface OllamaEmbedRequest {
  model: string;
  input: string | string[];
  truncate?: boolean;
}

interface OllamaEmbedResponse {
  embeddings: number[][];
  model: string;
}

export class OllamaEmbeddingProvider implements EmbeddingProvider {
  readonly name = "ollama-embeddings";
  private baseUrl: string;
  private model: string;
  private dimensions: number;
  private requestTimeoutMs: number;
  private batchSize: number;
  private normalize: boolean;
  private compatibleModels: string[];
  private fallbackToFirstAvailable: boolean;

  constructor(config?: {
    baseUrl?: string;
    model?: string;
    compatibleModels?: string[];
    fallbackToFirstAvailable?: boolean;
    dimensions?: number;
    requestTimeoutMs?: number;
    batchSize?: number;
    normalize?: boolean;
  }) {
    this.baseUrl = config?.baseUrl ?? "http://localhost:11434";
    this.model = config?.model ?? "nomic-embed-text";
    this.compatibleModels = config?.compatibleModels ?? [];
    this.fallbackToFirstAvailable = config?.fallbackToFirstAvailable ?? true;
    this.dimensions = config?.dimensions ?? 768;
    this.requestTimeoutMs = config?.requestTimeoutMs ?? 30_000;
    this.batchSize = config?.batchSize ?? 32;
    this.normalize = config?.normalize ?? true;
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

  getDimensions(): number {
    return this.dimensions;
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) throw new Error(`Ollama list models failed: ${response.statusText}`);
      const data = await response.json() as { models?: Array<{ name: string }> };
      return (data.models ?? []).map((model) => model.name);
    } catch (error) {
      throw new Error(`Failed to list Ollama models: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async describeModelSelection(requestedModel?: string): Promise<string> {
    const targetModel = requestedModel ?? this.model;
    const installedModels = await this.listModels();
    const selection = selectBestAvailableModel({
      requestedModel: targetModel,
      installedModels,
      compatibleModels: this.compatibleModels,
      fallbackToFirstAvailable: this.fallbackToFirstAvailable,
      allowAnyInstalledFallback: false,
    });

    if (!selection.selectedModel) {
      return `configured ${targetModel}; no compatible installed embedding model found`;
    }

    if (selection.reason === "requested") {
      return `${selection.selectedModel} selected (${selection.installedModels.length} models installed)`;
    }

    if (selection.reason === "compatible") {
      return `${selection.selectedModel} selected for configured ${targetModel} (${selection.installedModels.length} models installed)`;
    }

    return `${selection.selectedModel} fallback selected for configured ${targetModel} (${selection.installedModels.length} models installed)`;
  }

  async embed(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];

    // Process in batches
    for (let i = 0; i < texts.length; i += this.batchSize) {
      const batch = texts.slice(i, i + this.batchSize);
      const response = await this.embedBatch(batch);
      results.push(...response.embeddings);
    }

    return this.normalize ? results.map((v) => this.normalizeVector(v)) : results;
  }

  async embedQuery(text: string): Promise<number[]> {
    const result = await this.embed([text]);
    return result[0];
  }

  private async embedBatch(texts: string[]): Promise<OllamaEmbedResponse> {
    const selectedModel = await this.resolveModel(this.model);
    const body: OllamaEmbedRequest = {
      model: selectedModel,
      input: texts,
      truncate: true,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/api/embed`, {
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

      return await response.json() as OllamaEmbedResponse;
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`Embedding request timed out after ${this.requestTimeoutMs}ms`);
      }
      if (isModelMissingError(error) && this.fallbackToFirstAvailable) {
        const fallbackModel = await this.resolveModel(this.model, selectedModel);
        if (fallbackModel !== selectedModel) {
          return await this.embedBatchWithModel(texts, fallbackModel);
        }
      }
      throw error;
    }
  }

  private async embedBatchWithModel(texts: string[], model: string): Promise<OllamaEmbedResponse> {
    const body: OllamaEmbedRequest = {
      model,
      input: texts,
      truncate: true,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/api/embed`, {
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

      return await response.json() as OllamaEmbedResponse;
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`Embedding request timed out after ${this.requestTimeoutMs}ms`);
      }
      throw error;
    }
  }

  private async resolveModel(requestedModel: string, excludeModel?: string): Promise<string> {
    const installedModels = await this.listModels();
    const selection = selectBestAvailableModel({
      requestedModel,
      installedModels: excludeModel
        ? installedModels.filter((model) => model !== excludeModel)
        : installedModels,
      compatibleModels: this.compatibleModels,
      fallbackToFirstAvailable: this.fallbackToFirstAvailable,
      allowAnyInstalledFallback: false,
    });

    if (!selection.selectedModel) {
      throw new Error(
        `No compatible Ollama embedding model found for "${requestedModel}". Installed models: ${selection.installedModels.join(", ") || "none"}`
      );
    }

    return selection.selectedModel;
  }

  private normalizeVector(vec: number[]): number[] {
    const magnitude = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
    if (magnitude === 0) return vec;
    return vec.map((v) => v / magnitude);
  }
}
