export interface LatestRunSummary {
  runId: string;
  status: string;
  filesProcessed: number;
  conversationsFound: number;
  rawConversationsWritten: number;
  rawConversationsSkipped: number;
  segmentsCreated: number;
  segmentsPurged: number;
  warnings: number;
  errors: number;
}

export interface BatchAggregateSummary {
  filesAttempted: number;
  filesSucceeded: number;
  filesFailed: number;
  duplicateRate: number;
  privateReviewRate: number;
  segmentYield: number;
  purgeRate: number;
}

export interface BatchDeltaSummary {
  comparable: boolean;
  duplicateRateDelta?: number;
  privateReviewRateDelta?: number;
  segmentYieldDelta?: number;
  purgeRateDelta?: number;
}

export interface DiagnosticsRecommendation {
  id: string;
  message: string;
}
