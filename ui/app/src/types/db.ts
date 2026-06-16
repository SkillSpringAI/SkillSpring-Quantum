export type DbTier =
  | "tier0_raw"
  | "tier1_processed"
  | "tier2_curated"
  | "tier3_private_review"
  | "review_queue"
  | "purge";

export interface DbCollection {
  tier: DbTier;
  name: string;
}

export interface DbRecord {
  id: string;
  content: string;
  raw: unknown;
}

export interface DbQueryRequest {
  outputRoot: string;
  tier: DbTier;
  collection: string;
  limit?: number;
  offset?: number;
}

export interface DbQueryResult {
  outputRoot?: string;
  tier?: string;
  collection?: string;
  limit?: number;
  offset?: number;
  totalRecords?: number;
  hasMore?: boolean;
  records: DbRecord[];
}
