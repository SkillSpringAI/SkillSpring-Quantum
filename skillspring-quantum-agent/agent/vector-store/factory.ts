/**
 * Vector Store Factory
 */

import type { VectorStore } from "../types/index.js";
import { SQLiteVectorStore } from "./sqliteVectorStore.js";

interface VectorStoreConfig {
  store_type: string;
  sqlite: {
    db_path: string;
    table_name: string;
    metadata_table: string;
    index_type: string;
    dimensions: number;
    distance_metric: "cosine" | "euclidean" | "dot";
    enable_fts: boolean;
    fts_table_name: string;
  };
  maintenance: {
    auto_vacuum: "none" | "full" | "incremental";
  };
}

let cachedConfig: VectorStoreConfig | null = null;

export async function loadVectorStoreConfig(configPath?: string): Promise<VectorStoreConfig> {
  if (cachedConfig) return cachedConfig;
  const { readFile } = await import("node:fs/promises");
  const path = configPath ?? new URL("../config/vectorStore.config.json", import.meta.url);
  const raw = await readFile(path, "utf-8");
  const parsed = JSON.parse(raw) as VectorStoreConfig;
  cachedConfig = parsed;
  return parsed;
}

export function createVectorStore(config: VectorStoreConfig): VectorStore {
  switch (config.store_type) {
    case "sqlite":
      return new SQLiteVectorStore({
        dbPath: config.sqlite.db_path,
        tableName: config.sqlite.table_name,
        metadataTable: config.sqlite.metadata_table,
        dimensions: config.sqlite.dimensions,
        distanceMetric: config.sqlite.distance_metric,
        enableFts: config.sqlite.enable_fts,
        ftsTableName: config.sqlite.fts_table_name,
        autoVacuum: config.maintenance.auto_vacuum,
      });
    default:
      throw new Error(`Vector store type "${config.store_type}" not implemented. Use "sqlite".`);
  }
}

export function clearVectorStoreCache(): void {
  cachedConfig = null;
}
