import type {
  DesktopCommandRequest,
  DesktopCommandResponse,
  DesktopCommandName,
  ImportPathPayload,
  ReviewDecisionPayload,
  RunFilePayload,
  BatchRunPayload,
  PromotePayload,
  RestorePayload,
  MergeFoldersPayload,
  DbListCollectionsPayload,
  DbReadCollectionPayload,
  GovernanceListRulesPayload,
  GovernanceReadRulePayload,
  GovernanceWriteRulePayload,
  InspectImportSourcePayload,
  ImportHistoryPayload,
  QueryImportHistoryPayload,
  ImportRetrievalIndexPayload,
  RetrievalSavedViewsPayload,
  SaveRetrievalViewPayload,
  DeleteRetrievalViewPayload,
  OpenPathPayload,
  PathExistsResult,
  DatasetLatestRunPayload,
  DatasetPreviewPayload
} from "../types/bridge";
import { executeMockDesktopCommand } from "./mockDesktopExecutor";

export function desktopBridgeAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.skillspringDesktop !== "undefined";
}

function unavailable(command: DesktopCommandName): DesktopCommandResponse {
  return {
    ok: false,
    command,
    error: "Desktop bridge unavailable. Relaunch SkillSpring Quantum through Electron so real file inspection and imports can run."
  };
}

export async function invokeDesktopCommand<TPayload, TResult>(
  request: DesktopCommandRequest<TPayload>
): Promise<DesktopCommandResponse<TResult>> {
  console.log("Desktop bridge request:", request);

  if (!desktopBridgeAvailable()) {
    return unavailable(request.command) as DesktopCommandResponse<TResult>;
  }

  const mockResponse = await executeMockDesktopCommand(
    request.command,
    request.payload
  );

  return mockResponse as DesktopCommandResponse<TResult>;
}

export async function runFile(
  payload: RunFilePayload
): Promise<DesktopCommandResponse> {
  return invokeDesktopCommand<RunFilePayload, Record<string, unknown>>({
    command: "pipeline.runFile",
    payload
  });
}

export async function runImportPath(
  payload: ImportPathPayload
): Promise<DesktopCommandResponse> {
  return invokeDesktopCommand<ImportPathPayload, Record<string, unknown>>({
    command: "imports.run",
    payload
  });
}

export async function inspectImportPath(
  payload: InspectImportSourcePayload
): Promise<DesktopCommandResponse> {
  return invokeDesktopCommand<InspectImportSourcePayload, Record<string, unknown>>({
    command: "imports.inspect",
    payload
  });
}

export async function readImportHistory(
  payload: ImportHistoryPayload
): Promise<DesktopCommandResponse> {
  return invokeDesktopCommand<ImportHistoryPayload, Record<string, unknown>>({
    command: "imports.history",
    payload
  });
}

export async function queryImportHistory(
  payload: QueryImportHistoryPayload
): Promise<DesktopCommandResponse> {
  return invokeDesktopCommand<QueryImportHistoryPayload, Record<string, unknown>>({
    command: "imports.historyQuery",
    payload
  });
}

export async function readImportRetrievalIndex(
  payload: ImportRetrievalIndexPayload
): Promise<DesktopCommandResponse> {
  return invokeDesktopCommand<ImportRetrievalIndexPayload, Record<string, unknown>>({
    command: "imports.retrievalIndex",
    payload
  });
}

export async function readRetrievalSavedViews(
  payload: RetrievalSavedViewsPayload
): Promise<DesktopCommandResponse> {
  return invokeDesktopCommand<RetrievalSavedViewsPayload, Record<string, unknown>>({
    command: "retrieval.savedViews.read",
    payload
  });
}

export async function saveRetrievalSavedView(
  payload: SaveRetrievalViewPayload
): Promise<DesktopCommandResponse> {
  return invokeDesktopCommand<SaveRetrievalViewPayload, Record<string, unknown>>({
    command: "retrieval.savedViews.save",
    payload
  });
}

export async function deleteRetrievalSavedView(
  payload: DeleteRetrievalViewPayload
): Promise<DesktopCommandResponse> {
  return invokeDesktopCommand<DeleteRetrievalViewPayload, Record<string, unknown>>({
    command: "retrieval.savedViews.delete",
    payload
  });
}

export async function readLatestDatasetRun(
  payload: DatasetLatestRunPayload
): Promise<DesktopCommandResponse> {
  return invokeDesktopCommand<DatasetLatestRunPayload, Record<string, unknown>>({
    command: "datasets.latestRun",
    payload
  });
}

export async function readSegmentRetrievalIndex(
  payload: DatasetLatestRunPayload
): Promise<DesktopCommandResponse> {
  return invokeDesktopCommand<DatasetLatestRunPayload, Record<string, unknown>>({
    command: "datasets.segmentRetrievalIndex",
    payload
  });
}

export async function readDatasetPreview(
  payload: DatasetPreviewPayload
): Promise<DesktopCommandResponse> {
  return invokeDesktopCommand<DatasetPreviewPayload, Record<string, unknown>>({
    command: "datasets.preview",
    payload
  });
}

export async function pickDesktopFile(): Promise<DesktopCommandResponse> {
  return invokeDesktopCommand<Record<string, never>, Record<string, unknown>>({
    command: "dialog.pickFile",
    payload: {}
  });
}

export async function pickDesktopFolder(): Promise<DesktopCommandResponse> {
  return invokeDesktopCommand<Record<string, never>, Record<string, unknown>>({
    command: "dialog.pickFolder",
    payload: {}
  });
}

export async function openDesktopPath(
  payload: OpenPathPayload
): Promise<DesktopCommandResponse> {
  return invokeDesktopCommand<OpenPathPayload, Record<string, unknown>>({
    command: "shell.openPath",
    payload
  });
}

export async function checkDesktopPathExists(
  payload: OpenPathPayload
): Promise<DesktopCommandResponse<PathExistsResult>> {
  return invokeDesktopCommand<OpenPathPayload, PathExistsResult>({
    command: "shell.pathExists",
    payload
  });
}

export async function runBatch(
  payload: BatchRunPayload
): Promise<DesktopCommandResponse> {
  return invokeDesktopCommand<BatchRunPayload, Record<string, unknown>>({
    command: "batch.run",
    payload
  });
}

export async function buildBatchDiagnostics(
  payload: { outputRoot: string }
): Promise<DesktopCommandResponse> {
  return invokeDesktopCommand<{ outputRoot: string }, Record<string, unknown>>({
    command: "batch.diagnostics",
    payload
  });
}

export async function buildBatchDelta(
  payload: { outputRoot: string }
): Promise<DesktopCommandResponse> {
  return invokeDesktopCommand<{ outputRoot: string }, Record<string, unknown>>({
    command: "batch.delta",
    payload
  });
}

export async function buildReviewQueue(
  payload: { outputRoot: string }
): Promise<DesktopCommandResponse> {
  return invokeDesktopCommand<{ outputRoot: string }, Record<string, unknown>>({
    command: "db.review.buildQueue",
    payload
  });
}

export async function decideReviewQueueRecord(
  payload: ReviewDecisionPayload
): Promise<DesktopCommandResponse> {
  return invokeDesktopCommand<ReviewDecisionPayload, Record<string, unknown>>({
    command: "db.review.decide",
    payload
  });
}

export async function promoteCurated(
  payload: PromotePayload
): Promise<DesktopCommandResponse> {
  return invokeDesktopCommand<PromotePayload, Record<string, unknown>>({
    command: "db.promote",
    payload
  });
}

export async function listDbCollections(
  payload: DbListCollectionsPayload
): Promise<DesktopCommandResponse> {
  return invokeDesktopCommand<DbListCollectionsPayload, Record<string, unknown>>({
    command: "db.listCollections",
    payload
  });
}

export async function readDbCollection(
  payload: DbReadCollectionPayload
): Promise<DesktopCommandResponse> {
  return invokeDesktopCommand<DbReadCollectionPayload, Record<string, unknown>>({
    command: "db.readCollection",
    payload
  });
}

export async function listGovernanceRules(
  payload: GovernanceListRulesPayload
): Promise<DesktopCommandResponse> {
  return invokeDesktopCommand<GovernanceListRulesPayload, Record<string, unknown>>({
    command: "governance.listRules",
    payload
  });
}

export async function readGovernanceRule(
  payload: GovernanceReadRulePayload
): Promise<DesktopCommandResponse> {
  return invokeDesktopCommand<GovernanceReadRulePayload, Record<string, unknown>>({
    command: "governance.readRule",
    payload
  });
}

export async function writeGovernanceRule(
  payload: GovernanceWriteRulePayload
): Promise<DesktopCommandResponse> {
  return invokeDesktopCommand<GovernanceWriteRulePayload, Record<string, unknown>>({
    command: "governance.writeRule",
    payload
  });
}

export async function runDiagnostics(
  payload: { outputRoot: string }
): Promise<DesktopCommandResponse> {
  return invokeDesktopCommand<{ outputRoot: string }, Record<string, unknown>>({
    command: "diagnostics.run",
    payload
  });
}

export async function mergeFolders(
  payload: MergeFoldersPayload
): Promise<DesktopCommandResponse> {
  return invokeDesktopCommand<MergeFoldersPayload, Record<string, unknown>>({
    command: "folders.merge",
    payload
  });
}

export async function restorePurgedFile(
  payload: RestorePayload
): Promise<DesktopCommandResponse> {
  return invokeDesktopCommand<RestorePayload, Record<string, unknown>>({
    command: "purge.restore",
    payload
  });
}
