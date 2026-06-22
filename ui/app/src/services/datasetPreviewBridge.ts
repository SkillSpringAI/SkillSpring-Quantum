import type { DbRecord } from "../types/db";
import { readDatasetPreview } from "./desktopBridge";

export interface DatasetPreviewRequest {
  outputRoot: string;
  runId: string;
  kind: "topic_segments" | "prompt_response_pairs" | "micro_segments" | "private_review";
  limit?: number;
  offset?: number;
}

export interface DatasetPreviewResult {
  outputRoot: string;
  runId: string;
  kind: DatasetPreviewRequest["kind"];
  scope: "historical_run" | "latest_current_bundle";
  sourcePath: string;
  limit: number;
  offset: number;
  totalRecords: number;
  hasMore: boolean;
  records: DbRecord[];
}

export async function loadDatasetPreview(
  request: DatasetPreviewRequest
): Promise<DatasetPreviewResult> {
  const response = await readDatasetPreview(request);

  if (!response.ok) {
    console.error("Dataset preview failed:", response.error);
    return {
      outputRoot: request.outputRoot,
      runId: request.runId,
      kind: request.kind,
      scope: "latest_current_bundle",
      sourcePath: "",
      limit: request.limit ?? 5,
      offset: request.offset ?? 0,
      totalRecords: 0,
      hasMore: false,
      records: []
    };
  }

  const result = response.result as Omit<DatasetPreviewResult, "records"> & { records: unknown[] };
  return {
    ...result,
    records: (result.records ?? []).map((record, index) => ({
      id: buildRecordId(record, result.offset, index),
      content: JSON.stringify(record, null, 2),
      raw: record
    }))
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
