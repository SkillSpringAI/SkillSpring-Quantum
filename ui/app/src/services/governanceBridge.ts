import type {
  GovernanceRuleContent,
  GovernanceRuleFile,
  GovernanceSaveRequest,
  GovernanceSaveResult
} from "../types/governance";
import type {
  GovernanceListRulesResult,
  GovernanceReadRuleResult,
  GovernanceWriteRuleResult
} from "../types/governanceBridge";
import {
  listGovernanceRules,
  readGovernanceRule,
  writeGovernanceRule
} from "./desktopBridge";

export async function loadGovernanceRuleFiles(): Promise<GovernanceRuleFile[]> {
  const response = await listGovernanceRules({
    rootPath: "governance/rules"
  });

  if (!response.ok) {
    console.error(response.stderr || response.error);
    return [];
  }

  const result = response.result as GovernanceListRulesResult;
  return result.files ?? [];
}

export async function loadGovernanceRuleContent(
  file: GovernanceRuleFile
): Promise<GovernanceRuleContent> {
  const response = await readGovernanceRule({
    filePath: file.path
  });

  if (!response.ok) {
    return {
      file,
      rawText: "{\n  \"error\": \"Failed to load governance rule.\"\n}"
    };
  }

  const result = response.result as GovernanceReadRuleResult;
  return {
    file,
    rawText: result.rawText ?? ""
  };
}

export async function saveGovernanceRule(
  request: GovernanceSaveRequest
): Promise<GovernanceSaveResult> {
  const response = await writeGovernanceRule({
    filePath: request.filePath,
    rawText: request.rawText
  });

  if (!response.ok) {
    return {
      ok: false,
      message: response.error || response.stderr || "Governance rule save failed.",
      stdout: response.stdout,
      stderr: response.stderr,
      code: response.code
    };
  }

  const result = response.result as Partial<GovernanceWriteRuleResult> & Record<string, unknown>;

  return {
    ok: response.ok && (result.saved ?? true),
    message:
      response.message ||
      (result.saved ? "Governance rule save submitted." : "Governance rule save completed."),
    filePath: typeof result.filePath === "string" ? result.filePath : request.filePath,
    backupPath: typeof result.backupPath === "string" ? result.backupPath : undefined,
    reportPath: typeof result.reportPath === "string" ? result.reportPath : undefined,
    stdout: response.stdout,
    stderr: response.stderr,
    code: response.code
  };
}
