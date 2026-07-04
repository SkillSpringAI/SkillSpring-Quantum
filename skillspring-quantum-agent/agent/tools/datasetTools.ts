/**
 * Dataset Tools
 * Tools for querying and analyzing exported datasets
 */

import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import type { ToolExecutor, ToolContext } from "../types/index.js";

// ── Query Datasets Tool ──────────────────────────────────────────

export const queryDatasetsTool: ToolExecutor = {
  name: "query_datasets",
  description: "Query structured dataset JSONL files. Supports filtering by vendor, topic, date range, and text search. Returns matching records with analytics.",
  parameters: {
    type: "object",
    properties: {
      vendor: { type: "string", description: "Filter by vendor (chatgpt, claude, gemini, grok)" },
      topic: { type: "string", description: "Filter by topic label" },
      intent: { type: "string", description: "Filter by intent (troubleshooting, planning, decision, etc.)" },
      date_from: { type: "string", description: "Filter from date (ISO format)" },
      date_to: { type: "string", description: "Filter to date (ISO format)" },
      text_search: { type: "string", description: "Full-text search in prompt/response content" },
      limit: { type: "number", description: "Max records to return (default 20)" },
      aggregate: { type: "string", description: "Aggregation type: count, intents, topics, vendors" },
    },
    required: [],
  },

  async execute(args, context: ToolContext): Promise<string> {
    const vendor = args.vendor as string | undefined;
    const topic = args.topic as string | undefined;
    const intent = args.intent as string | undefined;
    const dateFrom = args.date_from as string | undefined;
    const dateTo = args.date_to as string | undefined;
    const textSearch = args.text_search as string | undefined;
    const limit = (args.limit as number) ?? 20;
    const aggregate = args.aggregate as string | undefined;

    const datasetsRoot = join(context.outputRoot, "datasets");

    try {
      // Find dataset files
      const files = await readdir(datasetsRoot);
      const jsonlFiles = files.filter((f) => f.endsWith(".jsonl"));

      if (jsonlFiles.length === 0) {
        return "No dataset files found. Run an import first to generate datasets.";
      }

      interface DatasetRecord {
        vendor?: string;
        topic?: string;
        intent?: string;
        date?: string;
        prompt?: string;
        response?: string;
        source_file?: string;
        [key: string]: unknown;
      }

      const allRecords: DatasetRecord[] = [];

      for (const file of jsonlFiles) {
        try {
          const content = await readFile(join(datasetsRoot, file), "utf-8");
          const lines = content.split("\n").filter((l) => l.trim());
          for (const line of lines) {
            try {
              const record = JSON.parse(line) as DatasetRecord;
              record.source_file = file;
              allRecords.push(record);
            } catch {
              // skip malformed lines
            }
          }
        } catch {
          // skip unreadable files
        }
      }

      // Apply filters
      let filtered = allRecords;

      if (vendor) {
        filtered = filtered.filter((r) =>
          r.vendor?.toLowerCase().includes(vendor.toLowerCase())
        );
      }
      if (topic) {
        filtered = filtered.filter((r) =>
          r.topic?.toLowerCase().includes(topic.toLowerCase())
        );
      }
      if (intent) {
        filtered = filtered.filter((r) =>
          r.intent?.toLowerCase() === intent.toLowerCase()
        );
      }
      if (dateFrom) {
        filtered = filtered.filter((r) => r.date && r.date >= dateFrom);
      }
      if (dateTo) {
        filtered = filtered.filter((r) => r.date && r.date <= dateTo);
      }
      if (textSearch) {
        const lower = textSearch.toLowerCase();
        filtered = filtered.filter(
          (r) =>
            r.prompt?.toLowerCase().includes(lower) ||
            r.response?.toLowerCase().includes(lower)
        );
      }

      // Aggregation mode
      if (aggregate) {
        return performAggregation(filtered, aggregate);
      }

      // Return records
      const results = filtered.slice(0, limit);

      if (results.length === 0) {
        return "No dataset records match the specified criteria.";
      }

      const lines = results.map((r, i) => {
        const preview = r.prompt
          ? String(r.prompt).slice(0, 120).replace(/\s+/g, " ") + "..."
          : "[no preview]";
        return `${i + 1}. **${r.topic ?? "unknown"}** | ${r.vendor ?? "unknown"} | ${r.intent ?? "unknown"}\n   ${preview}`;
      });

      return `Found ${filtered.length} matching records (showing ${results.length}):\n\n${lines.join("\n\n")}`;
    } catch (error) {
      return `Error querying datasets: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
};

// ── Import Status Tool ───────────────────────────────────────────

export const importStatusTool: ToolExecutor = {
  name: "import_status",
  description: "Check the status of recent imports. Returns a summary of processed files, conversations, topics, and any warnings or errors.",
  parameters: {
    type: "object",
    properties: {
      last_n: { type: "number", description: "Number of recent imports to check (default 5)" },
    },
    required: [],
  },

  async execute(args, context: ToolContext): Promise<string> {
    const lastN = (args.last_n as number) ?? 5;
    const historyPath = join(context.outputRoot, "import_history");

    try {
      const files = await readdir(historyPath);
      const jsonFiles = files
        .filter((f) => f.endsWith(".json"))
        .sort()
        .reverse()
        .slice(0, lastN);

      if (jsonFiles.length === 0) {
        return "No import history found.";
      }

      const summaries: string[] = [];

      for (const file of jsonFiles) {
        try {
          const content = await readFile(join(historyPath, file), "utf-8");
          const record = JSON.parse(content) as {
            run_id?: string;
            started_at?: string;
            status?: string;
            files_processed?: number;
            conversations_found?: number;
            segments_created?: number;
            topics?: string[];
            warnings?: string[];
            errors?: string[];
          };

          const date = record.started_at
            ? new Date(record.started_at).toLocaleString()
            : "unknown";
          const topics = (record.topics ?? []).join(", ") || "none";

          summaries.push(
            `- **${date}** | Status: ${record.status ?? "unknown"}\n` +
              `  Files: ${record.files_processed ?? 0} | ` +
              `Conversations: ${record.conversations_found ?? 0} | ` +
              `Segments: ${record.segments_created ?? 0}\n` +
              `  Topics: ${topics}` +
              (record.errors?.length ? `\n  Errors: ${record.errors.length}` : "")
          );
        } catch {
          summaries.push(`- ${file}: [unreadable]`);
        }
      }

      return `Recent imports (${jsonFiles.length}):\n\n${summaries.join("\n\n")}`;
    } catch (error) {
      return `Error checking import status: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
};

// ── Run Diagnostic Tool ──────────────────────────────────────────

export const runDiagnosticTool: ToolExecutor = {
  name: "run_diagnostic",
  description: "Run a system diagnostic to check agent health, provider availability, and indexed document counts.",
  parameters: {
    type: "object",
    properties: {
      check_type: { type: "string", description: "Type of check: all, llm, embeddings, vector_store, or archive_integrity" },
    },
    required: [],
  },

  async execute(args, _context: ToolContext): Promise<string> {
    const checkType = (args.check_type as string) ?? "all";
    const checks: string[] = [];

    if (checkType === "all" || checkType === "llm") {
      try {
        const { loadProviderConfig, getFirstAvailableProvider } = await import("../llm/providerFactory.js");
        const config = await loadProviderConfig();
        const provider = await getFirstAvailableProvider(config);
        const models = await provider.listModels();
        checks.push(`LLM Provider: **OK** (${provider.name}, ${models.length} models)`);
      } catch (error) {
        checks.push(`LLM Provider: **UNAVAILABLE** - ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    if (checkType === "all" || checkType === "embeddings") {
      try {
        const { loadEmbeddingsConfig, getFirstAvailableEmbeddingProvider } = await import("../embeddings/providerFactory.js");
        const config = await loadEmbeddingsConfig();
        const provider = await getFirstAvailableEmbeddingProvider(config);
        checks.push(`Embeddings: **OK** (${provider.name}, ${provider.getDimensions()}d)`);
      } catch (error) {
        checks.push(`Embeddings: **UNAVAILABLE** - ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    if (checkType === "all" || checkType === "vector_store") {
      try {
        const { loadVectorStoreConfig, createVectorStore } = await import("../vector-store/factory.js");
        const config = await loadVectorStoreConfig();
        const store = createVectorStore(config);
        // Use internal method if available
        const stats = (store as unknown as { getStats?: () => { totalEmbeddings: number } }).getStats?.();
        if (stats) {
          checks.push(`Vector Store: **OK** (${stats.totalEmbeddings} embeddings indexed)`);
        } else {
          checks.push(`Vector Store: **OK** (config loaded)`);
        }
      } catch (error) {
        checks.push(`Vector Store: **UNAVAILABLE** - ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    if (checkType === "all" || checkType === "archive_integrity") {
      try {
        const outputRoot = _context.outputRoot;
        const { readdir } = await import("node:fs/promises");
        const archiveDir = join(outputRoot, "archive");
        const topics = await readdir(archiveDir, { withFileTypes: true });
        const topicDirs = topics.filter((d) => d.isDirectory());
        let totalFiles = 0;
        for (const dir of topicDirs) {
          const files = await readdir(join(archiveDir, dir.name));
          totalFiles += files.filter((f) => f.endsWith(".md")).length;
        }
        checks.push(`Archive Integrity: **OK** (${topicDirs.length} topics, ${totalFiles} conversations)`);
      } catch (error) {
        checks.push(`Archive Integrity: **ERROR** - ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return `## Diagnostic Results\n\n${checks.join("\n\n")}`;
  },
};

// ── Aggregation Helper ───────────────────────────────────────────

function performAggregation(
  records: Array<Record<string, unknown>>,
  aggregate: string
): string {
  switch (aggregate) {
    case "count": {
      return `**Total records**: ${records.length}`;
    }
    case "intents": {
      const intents = new Map<string, number>();
      for (const r of records) {
        const intent = (r.intent as string) ?? "unknown";
        intents.set(intent, (intents.get(intent) ?? 0) + 1);
      }
      const sorted = Array.from(intents.entries()).sort((a, b) => b[1] - a[1]);
      return `**Intent distribution** (${records.length} records):\n${sorted.map(([k, v]) => `- ${k}: ${v}`).join("\n")}`;
    }
    case "topics": {
      const topics = new Map<string, number>();
      for (const r of records) {
        const topic = (r.topic as string) ?? "unknown";
        topics.set(topic, (topics.get(topic) ?? 0) + 1);
      }
      const sorted = Array.from(topics.entries()).sort((a, b) => b[1] - a[1]);
      return `**Topic distribution** (${records.length} records):\n${sorted.map(([k, v]) => `- ${k}: ${v}`).join("\n")}`;
    }
    case "vendors": {
      const vendors = new Map<string, number>();
      for (const r of records) {
        const vendor = (r.vendor as string) ?? "unknown";
        vendors.set(vendor, (vendors.get(vendor) ?? 0) + 1);
      }
      const sorted = Array.from(vendors.entries()).sort((a, b) => b[1] - a[1]);
      return `**Vendor distribution** (${records.length} records):\n${sorted.map(([k, v]) => `- ${k}: ${v}`).join("\n")}`;
    }
    default:
      return `Unknown aggregation type: ${aggregate}. Use: count, intents, topics, vendors.`;
  }
}
