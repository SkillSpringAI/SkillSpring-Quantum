import type { GovernanceRuleFile } from "./governance";

export interface GovernanceListRulesPayload {
  rootPath: string;
}

export interface GovernanceListRulesResult {
  rootPath: string;
  files: GovernanceRuleFile[];
}

export interface GovernanceReadRulePayload {
  filePath: string;
}

export interface GovernanceReadRuleResult {
  filePath: string;
  rawText: string;
}

export interface GovernanceWriteRulePayload {
  filePath: string;
  rawText: string;
}

export interface GovernanceWriteRuleResult {
  filePath: string;
  saved: boolean;
}
