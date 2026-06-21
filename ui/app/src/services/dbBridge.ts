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

export async function listCollections(outputRoot = "organized_output"): Promise<DbCollection[]> {
  const response = await listDbCollections({
    outputRoot
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
    limit: request.limit ?? 25,
    offset: request.offset ?? 0
  });

  if (!response.ok) {
    console.error("DB read failed:", response.error);
    return { records: [] };
  }

  const result = response.result as DbReadCollectionResult;
  const records = (result.records ?? []).map((record, index) => ({
    id: buildRecordId(record, result.offset, index),
    content: JSON.stringify(record, null, 2),
    raw: record
  }));

  return {
    outputRoot: result.outputRoot,
    tier: result.tier,
    collection: result.collection,
    limit: result.limit,
    offset: result.offset,
    totalRecords: result.totalRecords,
    hasMore: result.hasMore,
    records
  };
}

function buildRecordId(record: unknown, offset: number, index: number): string {
  if (record && typeof record === "object") {
    const candidate =
      ("id" in record && typeof record.id === "string" && record.id) ||
      ("conversation_id" in record &&
        typeof record.conversation_id === "string" &&
        "start_index" in record &&
        typeof record.start_index === "number" &&
        `${record.conversation_id}:${record.start_index}`) ||
      ("source_file" in record && typeof record.source_file === "string" && record.source_file);

    if (candidate) {
      return candidate;
    }
  }

  return `record-${offset + index}`;
}
