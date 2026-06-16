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
  InspectImportSourcePayload
} from "../types/bridge";
import { executeMockDesktopCommand } from "./mockDesktopExecutor";

function ok<TResult>(
  command: DesktopCommandName,
  result: TResult,
  message?: string
): DesktopCommandResponse<TResult> {
  return {
    ok: true,
    command,
    result,
    message
  };
}

export async function invokeDesktopCommand<TPayload, TResult>(
  request: DesktopCommandRequest<TPayload>
): Promise<DesktopCommandResponse<TResult>> {
  console.log("Desktop bridge request:", request);

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
