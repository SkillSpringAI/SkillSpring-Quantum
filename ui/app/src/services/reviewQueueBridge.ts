import type {
  ReviewDecisionRequest,
  ReviewDecisionResult,
  ReviewQueueRecord
} from "../types/review";
import {
  buildReviewQueue,
  decideReviewQueueRecord,
  readDbCollection
} from "./desktopBridge";

interface ReviewQueueLoadResult {
  records: ReviewQueueRecord[];
  message?: string;
}

export async function loadReviewQueue(outputRoot = "organized_output"): Promise<ReviewQueueLoadResult> {
  const response = await readDbCollection({
    outputRoot,
    tier: "tier2_curated",
    collection: "review_queue.topic_segments",
    limit: 100
  });

  if (!response.ok) {
    return {
      records: [],
      message: response.error
    };
  }

  const result = response.result as { records?: ReviewQueueRecord[] };
  return {
    records: result.records ?? [],
    message: response.message
  };
}

export async function rebuildReviewQueue(outputRoot = "organized_output"): Promise<ReviewDecisionResult> {
  const response = await buildReviewQueue({ outputRoot });

  return {
    ok: response.ok,
    message: response.ok
      ? response.message ?? "Review queue rebuilt."
      : response.error
  };
}

export function buildQueueKey(record: ReviewQueueRecord): string {
  return [
    record.conversation_id,
    record.topic,
    record.start_index,
    record.end_index
  ].join("|");
}

export async function submitReviewDecision(
  request: ReviewDecisionRequest
): Promise<ReviewDecisionResult> {
  const response = await decideReviewQueueRecord({
    outputRoot: request.outputRoot,
    decision: request.decision,
    queueKey: request.queueKey,
    reason: request.reason
  });

  if (!response.ok) {
    return {
      ok: false,
      message: response.error
    };
  }

  return {
    ok: true,
    message: response.message ?? "Review decision submitted."
  };
}
