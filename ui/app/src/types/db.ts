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
}

export interface DbQueryRequest {
  outputRoot: string;
  tier: DbTier;
  collection: string;
}

export interface DbQueryResult {
  records: DbRecord[];
}
