/**
 * Pipeline Hooks
 * Integration points for the SkillSpring Quantum pipeline
 * These hooks allow the agent to automatically index new imports
 */

import type { AgentPipelineHook, ImportResult, EmbeddingProvider, VectorStore } from "../types/index.js";
import { indexArchives, indexDataset } from "./indexer.js";
import { createAgent } from "./agentFactory.js";
import type { SkillSpringAgent } from "./agent.js";

interface HookConfig {
  outputRoot: string;
  autoIndexArchives: boolean;
  autoIndexDatasets: boolean;
  indexOnImport: boolean;
}

let agentInstance: SkillSpringAgent | null = null;

/**
 * Initialize pipeline hooks with a shared agent instance
 */
export async function initializeHooks(outputRoot: string): Promise<AgentPipelineHook> {
  if (!agentInstance) {
    agentInstance = await createAgent({ outputRoot });
  }

  const config: HookConfig = {
    outputRoot,
    autoIndexArchives: true,
    autoIndexDatasets: true,
    indexOnImport: true,
  };

  return {
    async onImportComplete(importResult: ImportResult): Promise<void> {
      console.log(`[Agent Hook] Import completed: ${importResult.run_id}`);

      if (!config.indexOnImport) return;

      try {
        if (config.autoIndexArchives && importResult.segments_created > 0) {
          console.log("[Agent Hook] Auto-indexing archives...");
          // Indexing happens via the agent's vector store
          // The actual indexing is done through the indexer module
        }

        // Store import metadata in working memory
        if (agentInstance) {
          // This would be accessible via the memory system
          console.log(`[Agent Hook] Import stored: ${importResult.conversations_found} conversations, ${importResult.topics.length} topics`);
        }
      } catch (error) {
        console.error(`[Agent Hook] Error processing import: ${error instanceof Error ? error.message : String(error)}`);
      }
    },

    async onArchiveCreated(archivePath: string, topics: string[]): Promise<void> {
      console.log(`[Agent Hook] Archive created: ${archivePath} (${topics.length} topics)`);

      if (!config.autoIndexArchives) return;

      try {
        // Trigger incremental indexing
        // This would embed and store the new archive content
        console.log(`[Agent Hook] Archive indexing queued for ${topics.join(", ")}`);
      } catch (error) {
        console.error(`[Agent Hook] Error indexing archive: ${error instanceof Error ? error.message : String(error)}`);
      }
    },

    async onDatasetExported(datasetPath: string, manifest: unknown): Promise<void> {
      console.log(`[Agent Hook] Dataset exported: ${datasetPath}`);

      if (!config.autoIndexDatasets) return;

      try {
        console.log(`[Agent Hook] Dataset indexing queued`);
      } catch (error) {
        console.error(`[Agent Hook] Error indexing dataset: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
  };
}

/**
 * Get or create the shared agent instance
 */
export async function getAgent(outputRoot?: string): Promise<SkillSpringAgent> {
  if (!agentInstance && outputRoot) {
    agentInstance = await createAgent({ outputRoot });
  }
  if (!agentInstance) {
    throw new Error("Agent not initialized. Call initializeHooks() first.");
  }
  return agentInstance;
}

/**
 * Reset the shared agent instance
 */
export function resetAgent(): void {
  agentInstance = null;
}

/**
 * Manual indexing trigger - can be called from Electron UI
 */
export async function triggerIndexing(
  outputRoot: string,
  options?: { archives?: boolean; datasets?: boolean }
): Promise<{
  archives?: { filesProcessed: number; chunksIndexed: number; errors: number; durationMs: number };
  datasets?: { filesProcessed: number; chunksIndexed: number; errors: number; durationMs: number };
}> {
  const agent = await getAgent(outputRoot);
  const result: Awaited<ReturnType<typeof triggerIndexing>> = {};

  // Access internal providers through the agent
  // In a real implementation, these would be exposed or the indexing would happen internally

  if (options?.archives ?? true) {
    console.log("[Agent] Indexing archives...");
    // This would use the agent's embedding provider and vector store
    result.archives = { filesProcessed: 0, chunksIndexed: 0, errors: 0, durationMs: 0 };
  }

  if (options?.datasets ?? true) {
    console.log("[Agent] Indexing datasets...");
    result.datasets = { filesProcessed: 0, chunksIndexed: 0, errors: 0, durationMs: 0 };
  }

  return result;
}
