import type { DbCollection, DbRecord } from "./db";

export interface DbListCollectionsPayload {
  outputRoot: string;
}

export interface DbListCollectionsResult {
  outputRoot: string;
  dbRoot: string;
  collections: DbCollection[];
}

export interface DbReadCollectionPayload {
  outputRoot: string;
  tier: string;
  collection: string;
  limit: number;
  offset?: number;
}

export interface DbReadCollectionResult {
  outputRoot: string;
  tier: string;
  collection: string;
  limit: number;
  offset: number;
  totalRecords: number;
  hasMore: boolean;
  records: unknown[];
}
