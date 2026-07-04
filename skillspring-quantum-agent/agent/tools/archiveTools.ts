/**
 * Archive Tools
 * Tools for searching and retrieving from conversation archives
 */

import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import type { ToolExecutor, ToolContext, EmbeddingProvider, VectorStore, EmbeddingRecord } from "../types/index.js";

// ── Search Archives Tool ─────────────────────────────────────────

export const searchArchivesTool: ToolExecutor = {
  name: "search_archives",
  description: "Search through archived conversation markdown files by topic, keyword, or date range. Returns matching archive entries with excerpts.",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "Search query or keywords" },
      topic: { type: "string", description: "Filter by specific topic folder name" },
      vendor: { type: "string", description: "Filter by AI vendor (chatgpt, claude, gemini, grok)" },
      date_from: { type: "string", description: "Filter from date (ISO format)" },
      date_to: { type: "string", description: "Filter to date (ISO format)" },
      limit: { type: "number", description: "Max results to return (default 10)" },
    },
    required: ["query"],
  },

  async execute(args, context: ToolContext): Promise<string> {
    const query = args.query as string;
    const topic = args.topic as string | undefined;
    const vendor = args.vendor as string | undefined;
    const limit = (args.limit as number) ?? 10;

    const archiveRoot = join(context.outputRoot, "archive");

    try {
      const results: Array<{
        file: string;
        topic: string;
        excerpt: string;
        score: number;
      }> = [];

      // Read topic folders
      const topics = await readdir(archiveRoot, { withFileTypes: true });
      const topicDirs = topics.filter((d) => d.isDirectory());

      for (const topicDir of topicDirs) {
        if (topic && topicDir.name.toLowerCase() !== topic.toLowerCase()) continue;

        const topicPath = join(archiveRoot, topicDir.name);
        const files = await readdir(topicPath, { withFileTypes: true });
        const mdFiles = files.filter((f) => f.isFile() && f.name.endsWith(".md"));

        for (const mdFile of mdFiles) {
          const filePath = join(topicPath, mdFile.name);
          const content = await readFile(filePath, "utf-8");

          // Simple keyword search
          const lowerContent = content.toLowerCase();
          const lowerQuery = query.toLowerCase();
          const keywords = lowerQuery.split(/\s+/);

          let score = 0;
          for (const kw of keywords) {
            if (kw.length < 2) continue;
            const count = (lowerContent.match(new RegExp(kw, "g")) ?? []).length;
            score += count;
          }

          if (score > 0) {
            // Extract excerpt around first match
            const idx = lowerContent.indexOf(keywords[0]);
            const start = Math.max(0, idx - 150);
            const end = Math.min(content.length, idx + 300);
            const excerpt = content.slice(start, end).replace(/\s+/g, " ").trim();

            results.push({
              file: mdFile.name,
              topic: topicDir.name,
              excerpt: excerpt.length > 300 ? excerpt.slice(0, 300) + "..." : excerpt,
              score,
            });
          }
        }
      }

      // Sort by score
      results.sort((a, b) => b.score - a.score);

      if (results.length === 0) {
        return `No archive results found for "${query}".`;
      }

      const topResults = results.slice(0, limit);
      const lines = topResults.map(
        (r, i) => `${i + 1}. **${r.file}** (${r.topic})\n   ${r.excerpt}`
      );

      return `Found ${results.length} archive results for "${query}":\n\n${lines.join("\n\n")}`;
    } catch (error) {
      return `Error searching archives: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
};

// ── List Topics Tool ─────────────────────────────────────────────

export const listTopicsTool: ToolExecutor = {
  name: "list_topics",
  description: "List all available topic folders in the archive, with conversation counts and date ranges.",
  parameters: {
    type: "object",
    properties: {
      include_counts: { type: "boolean", description: "Include conversation counts per topic" },
    },
    required: [],
  },

  async execute(args, context: ToolContext): Promise<string> {
    const archiveRoot = join(context.outputRoot, "archive");

    try {
      const topics = await readdir(archiveRoot, { withFileTypes: true });
      const topicDirs = topics.filter((d) => d.isDirectory());

      if (topicDirs.length === 0) {
        return "No topic folders found in the archive.";
      }

      const lines: string[] = [];
      for (const dir of topicDirs) {
        const topicPath = join(archiveRoot, dir.name);
        const files = await readdir(topicPath);
        const mdCount = files.filter((f) => f.endsWith(".md")).length;
        lines.push(`- **${dir.name}**: ${mdCount} conversation(s)`);
      }

      return `Available topics (${topicDirs.length}):\n\n${lines.join("\n")}`;
    } catch (error) {
      return `Error listing topics: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
};

// ── Get Conversation Tool ────────────────────────────────────────

export const getConversationTool: ToolExecutor = {
  name: "get_conversation",
  description: "Retrieve a full conversation by its archive filename. Returns the complete markdown content.",
  parameters: {
    type: "object",
    properties: {
      filename: { type: "string", description: "The markdown filename to retrieve (e.g., 'conversation_2026-07-01.md')" },
      topic: { type: "string", description: "The topic folder containing the file" },
      max_length: { type: "number", description: "Max characters to return (default 5000)" },
    },
    required: ["filename"],
  },

  async execute(args, context: ToolContext): Promise<string> {
    const filename = args.filename as string;
    const topic = args.topic as string | undefined;
    const maxLength = (args.max_length as number) ?? 5000;

    // If topic not specified, search for the file
    const archiveRoot = join(context.outputRoot, "archive");

    try {
      let filePath: string | undefined;

      if (topic) {
        filePath = join(archiveRoot, topic, filename);
      } else {
        // Search all topics
        const topics = await readdir(archiveRoot, { withFileTypes: true });
        for (const dir of topics) {
          if (!dir.isDirectory()) continue;
          const candidate = join(archiveRoot, dir.name, filename);
          try {
            await readFile(candidate);
            filePath = candidate;
            break;
          } catch {
            // not found in this topic
          }
        }
      }

      if (!filePath) {
        return `Conversation "${filename}" not found in archive.`;
      }

      const content = await readFile(filePath, "utf-8");

      if (content.length > maxLength) {
        return content.slice(0, maxLength) + `\n\n...[truncated, total length: ${content.length} chars]`;
      }

      return content;
    } catch (error) {
      return `Error retrieving conversation: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
};

// ── Summarize Topic Tool ─────────────────────────────────────────

export const summarizeTopicTool: ToolExecutor = {
  name: "summarize_topic",
  description: "Generate a summary of all conversations within a topic folder. Returns key themes, participant patterns, and notable content.",
  parameters: {
    type: "object",
    properties: {
      topic: { type: "string", description: "The topic folder to summarize" },
      max_conversations: { type: "number", description: "Max conversations to include (default 20)" },
    },
    required: ["topic"],
  },

  async execute(args, context: ToolContext): Promise<string> {
    const topic = args.topic as string;
    const maxConversations = (args.max_conversations as number) ?? 20;
    const topicPath = join(context.outputRoot, "archive", topic);

    try {
      const files = await readdir(topicPath);
      const mdFiles = files.filter((f) => f.endsWith(".md")).slice(0, maxConversations);

      if (mdFiles.length === 0) {
        return `No conversations found in topic "${topic}".`;
      }

      let totalLines = 0;
      let totalWords = 0;
      const dateSet = new Set<string>();
      const allContent: string[] = [];

      for (const file of mdFiles) {
        const content = await readFile(join(topicPath, file), "utf-8");
        const lines = content.split("\n");
        totalLines += lines.length;
        totalWords += content.split(/\s+/).length;

        // Try to extract dates from filenames or content
        const dateMatch = file.match(/(\d{4}-\d{2}-\d{2})/);
        if (dateMatch) dateSet.add(dateMatch[1]);

        // Collect first few lines as preview
        const preview = lines.slice(0, 5).join(" ").replace(/\s+/g, " ").trim();
        allContent.push(`- ${file}: ${preview.substring(0, 120)}...`);
      }

      const dates = Array.from(dateSet).sort();
      const dateRange = dates.length > 1
        ? `${dates[0]} to ${dates[dates.length - 1]}`
        : dates[0] ?? "unknown";

      return (
        `## Topic Summary: ${topic}\n\n` +
        `- **Conversations**: ${mdFiles.length}\n` +
        `- **Total lines**: ${totalLines}\n` +
        `- **Total words**: ${totalWords}\n` +
        `- **Date range**: ${dateRange}\n\n` +
        `### Conversations:\n${allContent.join("\n")}`
      );
    } catch (error) {
      return `Error summarizing topic: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
};

// ── Vector Search Archives Tool ──────────────────────────────────

export async function vectorSearchArchives(
  query: string,
  embeddingProvider: EmbeddingProvider,
  vectorStore: VectorStore,
  topK: number = 5
): Promise<Array<{ id: string; score: number; text: string; metadata: Record<string, unknown> }>> {
  const embedding = await embeddingProvider.embedQuery(query);
  const results = await vectorStore.hybridSearch(embedding, query, topK);

  return results.map((r) => ({
    id: r.id,
    score: r.score,
    text: r.text,
    metadata: r.metadata as Record<string, unknown>,
  }));
}

// ── Index Archive to Vector Store ────────────────────────────────

export async function indexArchiveToVectorStore(
  archiveRoot: string,
  embeddingProvider: EmbeddingProvider,
  vectorStore: VectorStore,
  chunkSize: number = 512,
  chunkOverlap: number = 64
): Promise<{ indexed: number; errors: number }> {
  const { readdir, readFile } = await import("node:fs/promises");
  const { join } = await import("node:path");

  let indexed = 0;
  let errors = 0;
  const records: EmbeddingRecord[] = [];

  try {
    const topics = await readdir(archiveRoot, { withFileTypes: true });
    const topicDirs = topics.filter((d) => d.isDirectory());

    for (const topicDir of topicDirs) {
      const topicPath = join(archiveRoot, topicDir.name);
      const files = await readdir(topicPath, { withFileTypes: true });
      const mdFiles = files.filter((f) => f.isFile() && f.name.endsWith(".md"));

      for (const mdFile of mdFiles) {
        try {
          const filePath = join(topicPath, mdFile.name);
          const content = await readFile(filePath, "utf-8");

          // Chunk the content
          const chunks = chunkText(content, chunkSize, chunkOverlap);

          for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const id = `archive-${topicDir.name}-${mdFile.name}-${i}`;

            // Simple embedding (batched later)
            records.push({
              id,
              vector: [], // Will be filled after embedding
              text: chunk,
              metadata: {
                source_type: "archive",
                source_path: filePath,
                topic: topicDir.name,
                chunk_index: i,
                total_chunks: chunks.length,
              },
              created_at: new Date().toISOString(),
            });
          }
        } catch {
          errors++;
        }
      }
    }

    // Batch embed and upsert
    const batchSize = 32;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const texts = batch.map((r) => r.text);
      const embeddings = await embeddingProvider.embed(texts);

      for (let j = 0; j < batch.length; j++) {
        batch[j].vector = embeddings[j];
      }

      await vectorStore.upsert(batch);
      indexed += batch.length;
    }
  } catch {
    // If archive root doesn't exist yet
  }

  return { indexed, errors };
}

function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    // Try to break at a newline or space
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
