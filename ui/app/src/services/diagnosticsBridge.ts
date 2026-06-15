import type {
  BatchAggregateSummary,
  BatchDeltaSummary,
  DiagnosticsRecommendation,
  LatestRunSummary
} from "../types/diagnostics";
import {
  buildBatchDelta,
  buildBatchDiagnostics,
  runDiagnostics
} from "./desktopBridge";

export async function loadLatestRunSummary(): Promise<LatestRunSummary> {
  return {
    runId: "latest-run-demo",
    status: "success",
    filesProcessed: 1,
    conversationsFound: 42,
    rawConversationsWritten: 40,
    rawConversationsSkipped: 2,
    segmentsCreated: 130,
    segmentsPurged: 14,
    warnings: 3,
    errors: 0
  };
}

export async function loadBatchAggregateSummary(): Promise<BatchAggregateSummary> {
  return {
    filesAttempted: 9,
    filesSucceeded: 9,
    filesFailed: 0,
    duplicateRate: 0.08,
    privateReviewRate: 0.04,
    segmentYield: 1.8,
    purgeRate: 0.12
  };
}

export async function loadBatchDeltaSummary(): Promise<BatchDeltaSummary> {
  return {
    comparable: true,
    duplicateRateDelta: -0.01,
    privateReviewRateDelta: -0.005,
    segmentYieldDelta: 0.06,
    purgeRateDelta: 0.01
  };
}

export async function loadDiagnosticsRecommendations(): Promise<DiagnosticsRecommendation[]> {
  return [
    {
      id: "diag-1",
      message: "Duplicate rate is controlled, but alias collapse can still be tightened."
    },
    {
      id: "diag-2",
      message: "Private-review rate is moderate. Review thresholds only if it climbs materially."
    },
    {
      id: "diag-3",
      message: "Batch delta should remain part of routine health review after major rule changes."
    }
  ];
}

export async function triggerRunDiagnostics(outputRoot: string) {
  return runDiagnostics({ outputRoot });
}

export async function triggerBatchDiagnostics(outputRoot: string) {
  return buildBatchDiagnostics({ outputRoot });
}

export async function triggerBatchDelta(outputRoot: string) {
  return buildBatchDelta({ outputRoot });
}
