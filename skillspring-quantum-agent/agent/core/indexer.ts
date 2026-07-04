/**
 * Archive Indexer
 * Indexes existing archives into the vector store for RAG
 */

import { join } from "node:path";
import { readdir, readFile } from "node:fs/promises";
import type { EmbeddingProvider, VectorStore, EmbeddingRecord } from "../types/index.js";

export interface IndexerOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  batchSize?: number;
  onProgress?: (indexed: number, total: number) => void;
}

export interface IndexerResult {
  filesProcessed: number;
  chunksIndexed: number;
  errors: number;
  durationMs: number;
}

export async function indexArchives(
  outputRoot: string,
  embeddingProvider: EmbeddingProvider,
  vectorStore: VectorStore,
  options: IndexerOptions = {}
): Promise<IndexerResult> {
  const { chunkSize = 512, chunkOverlap = 64, batchSize = 32 } = options;
  const archiveRoot = join(outputRoot, "archive");

  const startTime = Date.now();
  let filesProcessed = 0;
  let chunksIndexed = 0;
  let errors = 0;

  try {
    // Collect all files to index
    const filesToIndex: Array<{ path: string; topic: string; filename: string }> = [];

    const topics = await readdir(archiveRoot, { withFileTypes: true });
    const topicDirs = topics.filter((d) => d.isDirectory());

    for (const topicDir of topicDirs) {
      const topicPath = join(archiveRoot, topicDir.name);
      const files = await readdir(topicPath, { withFileTypes: true });
      const mdFiles = files.filter((f) => f.isFile() && f.name.endsWith(".md"));

      for (const mdFile of mdFiles) {
        filesToIndex.push({
          path: join(topicPath, mdFile.name),
          topic: topicDir.name,
          filename: mdFile.name,
        });
      }
    }

    if (options.onProgress) {
      options.onProgress(0, filesToIndex.length);
    }

    // Process files
    const records: EmbeddingRecord[] = [];

    for (const fileInfo of filesToIndex) {
      try {
        const content = await readFile(fileInfo.path, "utf-8");
        const chunks = chunkText(content, chunkSize, chunkOverlap);

        for (let i = 0; i < chunks.length; i++) {
          records.push({
            id: `archive-${fileInfo.topic}-${fileInfo.filename}-${i}`,
            vector: [], // Filled after embedding
            text: chunks[i],
            metadata: {
              source_type: "archive",
              source_path: fileInfo.path,
              topic: fileInfo.topic,
              chunk_index: i,
              total_chunks: chunks.length,
            },
            created_at: new Date().toISOString(),
          });
        }

        filesProcessed++;

        // Flush batch if full
        if (records.length >= batchSize) {
          const flushSize = Math.min(records.length, batchSize);
          const batch = records.splice(0, flushSize);
          await embedAndUpsert(batch, embeddingProvider, vectorStore);
          chunksIndexed += batch.length;
        }

        if (options.onProgress) {
          options.onProgress(filesProcessed, filesToIndex.length);
        }
      } catch {
        errors++;
      }
    }

    // Flush remaining records
    if (records.length > 0) {
      await embedAndUpsert(records, embeddingProvider, vectorStore);
      chunksIndexed += records.length;
    }
  } catch {
    // Archive directory might not exist yet
  }

  return {
    filesProcessed,
    chunksIndexed,
    errors,
    durationMs: Date.now() - startTime,
  };
}

export async function indexDataset(
  outputRoot: string,
  embeddingProvider: EmbeddingProvider,
  vectorStore: VectorStore,
  options: IndexerOptions = {}
): Promise<IndexerResult> {
  const { batchSize = 32 } = options;
  const datasetsRoot = join(outputRoot, "datasets");

  const startTime = Date.now();
  let filesProcessed = 0;
  let chunksIndexed = 0;
  let errors = 0;

  try {
    const files = await readdir(datasetsRoot);
    const jsonlFiles = files.filter((f) => f.endsWith(".jsonl"));

    for (const file of jsonlFiles) {
      try {
        const content = await readFile(join(datasetsRoot, file), "utf-8");
        const lines = content.split("\n").filter((l) => l.trim());

        const records: EmbeddingRecord[] = [];

        for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
          try {
            const record = JSON.parse(lines[lineIdx]) as {
              prompt?: string;
              response?: string;
              topic?: string;
              vendor?: string;
              intent?: string;
              date?: string;
            };

            const text = record.prompt ?? record.response ?? "";
            if (!text) continue;

            records.push({
              id: `dataset-${file}-${lineIdx}`,
              vector: [],
              text,
              metadata: {
                source_type: "dataset",
                source_path: join(datasetsRoot, file),
                topic: record.topic ?? "unknown",
                vendor: record.vendor ?? "unknown",
              },
              created_at: record.date ?? new Date().toISOString(),
            });

            if (records.length >= batchSize) {
              const batch = records.splice(0, batchSize);
              await embedAndUpsert(batch, embeddingProvider, vectorStore);
              chunksIndexed += batch.length;
            }
          } catch {
            errors++;
          }
        }

        // Flush remaining
        if (records.length > 0) {
          await embedAndUpsert(records, embeddingProvider, vectorStore);
          chunksIndexed += records.length;
        }

        filesProcessed++;
      } catch {
        errors++;
      }
    }
  } catch {
    // Datasets directory might not exist
  }

  return {
    filesProcessed,
    chunksIndexed,
    errors,
    durationMs: Date.now() - startTime,
  };
}

// ── Helpers ──────────────────────────────────────────────────────

async function embedAndUpsert(
  records: EmbeddingRecord[],
  embeddingProvider: EmbeddingProvider,
  vectorStore: VectorStore
): Promise<void> {
  const texts = records.map((r) => r.text);
  const embeddings = await embeddingProvider.embed(texts);

  for (let i = 0; i < records.length; i++) {
    records[i].vector = embeddings[i];
  }

  await vectorStore.upsert(records);
}

function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    let breakPoint = end;

    if (end < text.length) {
      const newlineIdx = text.lastIndexOf("\n", end);
      const spaceIdx = text.lastIndexOf(" ", end);
      breakPoint = Math.max(newlineIdx, spaceIdx);
      if (breakPoint <= start) breakPoint = end;
    }

    chunks.push(text.slice(start, breakPoint).trim());
    start = breakPoint - overlap;
    if (start >= text.length) break;
  }

  return chunks.filter((c) => c.length > 0);
}
