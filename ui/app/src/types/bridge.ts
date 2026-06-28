export type DesktopCommandName =
  | "imports.run"
  | "imports.inspect"
  | "imports.history"
  | "imports.historyQuery"
  | "imports.retrievalIndex"
  | "retrieval.savedViews.read"
  | "retrieval.savedViews.save"
  | "retrieval.savedViews.delete"
  | "datasets.latestRun"
  | "datasets.preview"
  | "datasets.segmentRetrievalIndex"
  | "shell.openPath"
  | "shell.pathExists"
  | "dialog.pickFile"
  | "dialog.pickFolder"
  | "pipeline.runFile"
  | "batch.run"
  | "batch.diagnostics"
  | "batch.delta"
  | "db.review.buildQueue"
  | "db.review.decide"
  | "db.promote"
  | "db.listCollections"
  | "db.readCollection"
  | "governance.listRules"
  | "governance.readRule"
  | "governance.writeRule"
  | "diagnostics.run"
  | "notifications.archive"
  | "archive.markdown"
  | "folders.merge"
  | "purge.restore";

export interface DesktopCommandRequest<TPayload = Record<string, unknown>> {
  command: DesktopCommandName;
  payload: TPayload;
}

export interface DesktopCommandSuccess<TResult = unknown> {
  ok: true;
  command: DesktopCommandName;
  result: TResult;
  message?: string;
  error?: string;
  stdout?: string;
  stderr?: string;
  code?: number;
}

export interface DesktopCommandFailure {
  ok: false;
  command: DesktopCommandName;
  error: string;
  details?: string;
  stdout?: string;
  stderr?: string;
  code?: number;
}

export type DesktopCommandResponse<TResult = unknown> =
  | DesktopCommandSuccess<TResult>
  | DesktopCommandFailure;

export interface RunFilePayload {
  inputFile: string;
  outputRoot: string;
}

export interface ImportPathPayload {
  inputPath: string;
  outputRoot: string;
}

export interface BatchRunPayload {
  inputFolder: string;
  outputRoot: string;
}

export interface ReviewDecisionPayload {
  outputRoot: string;
  decision: "approve" | "reject";
  queueKey: string;
  reason: string;
}

export interface PromotePayload {
  outputRoot: string;
}

export interface RestorePayload {
  sourceFile: string;
  outputRoot: string;
}

export interface MergeFoldersPayload {
  outputRoot: string;
}

export interface DbListCollectionsPayload {
  outputRoot: string;
}

export interface DbReadCollectionPayload {
  outputRoot: string;
  tier: string;
  collection: string;
  limit: number;
  offset?: number;
}

export interface GovernanceListRulesPayload {
  rootPath: string;
}

export interface GovernanceReadRulePayload {
  filePath: string;
}

export interface GovernanceWriteRulePayload {
  filePath: string;
  rawText: string;
}

export interface ArchiveNotificationsPayload {
  outputRoot: string;
  limit: number;
}

export interface MarkdownArchivePayload {
  outputRoot: string;
  filePath?: string;
  includeContent?: boolean;
  includeTopics?: boolean;
}

export interface InspectImportSourcePayload {
  inputPath: string;
}

export interface ImportHistoryPayload {
  outputRoot: string;
  limit: number;
}

export interface QueryImportHistoryPayload {
  outputRoot: string;
  vendor?: string;
  topic?: string;
  text?: string;
  from?: string;
  to?: string;
  status?: "all" | "imported" | "skipped" | "failed";
}

export interface ImportRetrievalIndexPayload {
  outputRoot: string;
}

export interface RetrievalSavedViewsPayload {
  outputRoot: string;
}

export interface SaveRetrievalViewPayload {
  outputRoot: string;
  name: string;
  filters: {
    text: string;
    vendor: string;
    topic: string;
    status: "all" | "imported" | "skipped" | "failed";
    from: string;
    to: string;
  };
  selectedRecord?: {
    runAt: string;
    filePath: string;
  };
  selectedSegment?: {
    runId: string;
    conversationId: string;
    startIndex: number;
    endIndex: number;
  };
}

export interface DeleteRetrievalViewPayload {
  outputRoot: string;
  id: string;
}

export interface OpenPathPayload {
  targetPath: string;
}

export interface PathExistsResult {
  targetPath: string;
  exists: boolean;
}

export interface DatasetLatestRunPayload {
  outputRoot: string;
  limit?: number;
}

export interface DatasetPreviewPayload {
  outputRoot: string;
  runId: string;
  kind: "topic_segments" | "prompt_response_pairs" | "micro_segments" | "private_review";
  limit?: number;
  offset?: number;
}
