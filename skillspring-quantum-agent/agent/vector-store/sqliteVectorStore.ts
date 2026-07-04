/**
 * SQLite Vector Store
 * Local vector storage using SQLite with manual cosine similarity.
 * No native extensions required - pure Node.js implementation.
 */

import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type {
  VectorStore,
  EmbeddingRecord,
  SearchResult,
  MetadataFilter,
} from "../types/index.js";

export interface SQLiteVectorStoreConfig {
  dbPath: string;
  tableName?: string;
  metadataTable?: string;
  dimensions: number;
  distanceMetric?: "cosine" | "euclidean" | "dot";
  enableFts?: boolean;
  ftsTableName?: string;
  autoVacuum?: "none" | "full" | "incremental";
}

export class SQLiteVectorStore implements VectorStore {
  private db: DatabaseSync;
  private config: Required<SQLiteVectorStoreConfig>;
  private dimensions: number;

  constructor(config: SQLiteVectorStoreConfig) {
    this.config = {
      tableName: "embeddings",
      metadataTable: "embedding_metadata",
      distanceMetric: "cosine",
      enableFts: true,
      ftsTableName: "embedding_fts",
      autoVacuum: "incremental",
      ...config,
    };
    this.dimensions = config.dimensions;

    // Ensure directory exists
    const dir = dirname(this.config.dbPath);
    try {
      mkdirSync(dir, { recursive: true });
    } catch {
      // may already exist
    }

    this.db = new DatabaseSync(this.config.dbPath);
    this.initialize();
  }

  private initialize(): void {
    // Enable WAL mode for better concurrency
    this.db.exec("PRAGMA journal_mode = WAL;");
    this.db.exec(`PRAGMA auto_vacuum = ${this.config.autoVacuum.toUpperCase()};`);

    // Main embeddings table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ${this.config.tableName} (
        id TEXT PRIMARY KEY,
        vector TEXT NOT NULL,
        text TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);

    // Metadata table (key-value pairs linked to embeddings)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ${this.config.metadataTable} (
        embedding_id TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT,
        PRIMARY KEY (embedding_id, key),
        FOREIGN KEY (embedding_id) REFERENCES ${this.config.tableName}(id) ON DELETE CASCADE
      );
    `);

    // Full-text search table
    if (this.config.enableFts) {
      this.db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS ${this.config.ftsTableName} USING fts5(
          id UNINDEXED,
          text,
          content='',
          content_rowid=''
        );
      `);
    }

    // Indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_meta_embedding_id ON ${this.config.metadataTable}(embedding_id);
    `);
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_meta_key_value ON ${this.config.metadataTable}(key, value);
    `);
  }

  async upsert(records: EmbeddingRecord[]): Promise<void> {
    const insertVector = this.db.prepare(`
      INSERT OR REPLACE INTO ${this.config.tableName} (id, vector, text, created_at)
      VALUES (?, ?, ?, ?)
    `);

    const insertMeta = this.db.prepare(`
      INSERT OR REPLACE INTO ${this.config.metadataTable} (embedding_id, key, value)
      VALUES (?, ?, ?)
    `);

    const insertFts = this.db.prepare(`
      INSERT OR REPLACE INTO ${this.config.ftsTableName} (id, text)
      VALUES (?, ?)
    `);

    // Use a transaction
    this.db.exec("BEGIN TRANSACTION;");

    try {
      for (const record of records) {
        const vectorJson = JSON.stringify(record.vector);
        insertVector.run(record.id, vectorJson, record.text, record.created_at);

        // Insert metadata
        for (const [key, value] of Object.entries(record.metadata)) {
          if (value !== undefined && value !== null) {
            insertMeta.run(record.id, key, typeof value === "string" ? value : JSON.stringify(value));
          }
        }

        // Insert into FTS
        if (this.config.enableFts) {
          insertFts.run(record.id, record.text);
        }
      }

      this.db.exec("COMMIT;");
    } catch (error) {
      this.db.exec("ROLLBACK;");
      throw error;
    }
  }

  async search(
    query: number[],
    topK: number = 5,
    filter?: MetadataFilter
  ): Promise<SearchResult[]> {
    // Build filtered query if needed
    let ids: string[] | undefined;
    if (filter) {
      ids = await this.filterIds(filter);
      if (ids.length === 0) return [];
    }

    // Compute similarity for all (or filtered) vectors
    const candidates = this.getCandidates(ids);
    const scored: Array<{ id: string; score: number; text: string; metadata: EmbeddingRecord["metadata"] }> = [];

    for (const row of candidates) {
      const vector = JSON.parse(row.vector as string) as number[];
      const similarity = this.computeSimilarity(query, vector);
      const metadata = this.getMetadataForId(row.id as string);
      scored.push({
        id: row.id as string,
        score: similarity,
        text: row.text as string,
        metadata,
      });
    }

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, topK).map((s) => ({
      id: s.id,
      score: s.score,
      text: s.text,
      metadata: s.metadata as EmbeddingRecord["metadata"],
    }));
  }

  async hybridSearch(
    query: number[],
    queryText: string,
    topK: number = 5,
    filter?: MetadataFilter
  ): Promise<SearchResult[]> {
    // Vector search
    const vectorResults = await this.search(query, topK * 2, filter);

    // FTS search
    const ftsResults = this.ftsSearch(queryText, topK * 2);

    // Merge with weights
    const combined = new Map<string, SearchResult & { vectorScore: number; ftsScore: number }>();

    for (const r of vectorResults) {
      combined.set(r.id, { ...r, vectorScore: r.score, ftsScore: 0 });
    }

    for (const r of ftsResults) {
      const existing = combined.get(r.id);
      if (existing) {
        existing.ftsScore = r.score;
        existing.score = existing.vectorScore * 0.7 + r.score * 0.3;
      } else {
        combined.set(r.id, { ...r, vectorScore: 0, ftsScore: r.score, score: r.score * 0.3 });
      }
    }

    const results = Array.from(combined.values());
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, topK);
  }

  async delete(ids: string[]): Promise<void> {
    const stmt = this.db.prepare(`DELETE FROM ${this.config.tableName} WHERE id = ?`);

    this.db.exec("BEGIN TRANSACTION;");
    try {
      for (const id of ids) {
        stmt.run(id);
      }
      this.db.exec("COMMIT;");
    } catch (error) {
      this.db.exec("ROLLBACK;");
      throw error;
    }
  }

  async getById(id: string): Promise<EmbeddingRecord | null> {
    const stmt = this.db.prepare(`SELECT id, vector, text, created_at FROM ${this.config.tableName} WHERE id = ?`);
    const row = stmt.get(id) as { id: string; vector: string; text: string; created_at: string } | undefined;

    if (!row) return null;

    return {
      id: row.id,
      vector: JSON.parse(row.vector),
      text: row.text,
      metadata: this.getMetadataForId(row.id),
      created_at: row.created_at,
    };
  }

  async close(): Promise<void> {
    this.db.close();
  }

  getStats(): { totalEmbeddings: number; dimensions: number } {
    const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM ${this.config.tableName}`);
    const result = stmt.get() as { count: number };
    return { totalEmbeddings: result.count, dimensions: this.dimensions };
  }

  private filterIds(filter: MetadataFilter): string[] {
    const conditions: string[] = [];
    const values: (string | number)[] = [];

    for (const [key, value] of Object.entries(filter)) {
      if (value !== undefined) {
        conditions.push(`(key = ? AND value = ?)`);
        values.push(key, typeof value === "string" ? value : JSON.stringify(value));
      }
    }

    if (conditions.length === 0) return [];

    const query = `
      SELECT embedding_id FROM ${this.config.metadataTable}
      WHERE ${conditions.join(" OR ")}
      GROUP BY embedding_id
      HAVING COUNT(DISTINCT key) >= ${conditions.length}
    `;

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...values) as Array<{ embedding_id: string }>;
    return rows.map((r) => r.embedding_id);
  }

  private getCandidates(ids?: string[]): Array<{ id: unknown; vector: unknown; text: unknown }> {
    if (ids && ids.length > 0) {
      const placeholders = ids.map(() => "?").join(",");
      const stmt = this.db.prepare(`SELECT id, vector, text FROM ${this.config.tableName} WHERE id IN (${placeholders})`);
      return stmt.all(...ids) as Array<{ id: unknown; vector: unknown; text: unknown }>;
    }

    const stmt = this.db.prepare(`SELECT id, vector, text FROM ${this.config.tableName}`);
    return stmt.all() as Array<{ id: unknown; vector: unknown; text: unknown }>;
  }

  private getMetadataForId(id: string): EmbeddingRecord["metadata"] {
    const stmt = this.db.prepare(`SELECT key, value FROM ${this.config.metadataTable} WHERE embedding_id = ?`);
    const rows = stmt.all(id) as Array<{ key: string; value: string }>;

    const meta: Record<string, unknown> = {};
    for (const row of rows) {
      try {
        meta[row.key] = JSON.parse(row.value);
      } catch {
        meta[row.key] = row.value;
      }
    }
    return meta as EmbeddingRecord["metadata"];
  }

  private ftsSearch(queryText: string, topK: number): Array<{ id: string; score: number; text: string; metadata: EmbeddingRecord["metadata"] }> {
    if (!this.config.enableFts) return [];

    // Escape FTS query
    const escaped = queryText.replace(/"/g, '""').trim();
    if (!escaped) return [];

    const stmt = this.db.prepare(`
      SELECT id, rank FROM ${this.config.ftsTableName}
      WHERE text MATCH ?
      ORDER BY rank
      LIMIT ?
    `);

    const rows = stmt.all(`"${escaped}"`, topK) as Array<{ id: string; rank: number }>;

    return rows.map((row) => {
      const record = this.getByIdSync(row.id);
      return {
        id: row.id,
        score: 1 / (1 + Math.abs(row.rank)),
        text: record?.text ?? "",
        metadata: record?.metadata ?? { source_type: "archive" },
      };
    });
  }

  private getByIdSync(id: string): { text: string; metadata: EmbeddingRecord["metadata"] } | null {
    const stmt = this.db.prepare(`SELECT id, vector, text FROM ${this.config.tableName} WHERE id = ?`);
    const row = stmt.get(id) as { id: string; vector: string; text: string } | undefined;
    if (!row) return null;
    return {
      text: row.text,
      metadata: this.getMetadataForId(row.id),
    };
  }

  private computeSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
    }

    switch (this.config.distanceMetric) {
      case "cosine":
        return this.cosineSimilarity(a, b);
      case "euclidean":
        return this.euclideanSimilarity(a, b);
      case "dot":
        return this.dotProduct(a, b);
      default:
        return this.cosineSimilarity(a, b);
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }

  private euclideanSimilarity(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }
    return 1 / (1 + Math.sqrt(sum));
  }

  private dotProduct(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += a[i] * b[i];
    }
    return sum;
  }
}
