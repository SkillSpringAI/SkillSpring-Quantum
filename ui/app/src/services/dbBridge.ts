import type {
  DbCollection,
  DbQueryRequest,
  DbQueryResult
} from "../types/db";
import type {
  DbListCollectionsResult,
  DbReadCollectionResult
} from "../types/dbBridge";
import {
  listDbCollections,
  readDbCollection
} from "./desktopBridge";

export async function listCollections(): Promise<DbCollection[]> {
  const response = await listDbCollections({
    outputRoot: "organized_output"
  });

  if (!response.ok) {
    console.error("DB list failed:", response.error);
    return [];
  }

  const result = response.result as DbListCollectionsResult;
  return result.collections ?? [];
}

export async function queryCollection(
  request: DbQueryRequest
): Promise<DbQueryResult> {
  const response = await readDbCollection({
    outputRoot: request.outputRoot,
    tier: request.tier,
    collection: request.collection,
    limit: 25
  });

  if (!response.ok) {
    console.error("DB read failed:", response.error);
    return { records: [] };
  }

  const result = response.result as DbReadCollectionResult;
  return {
    records: result.records ?? []
  };
}
