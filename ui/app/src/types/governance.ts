export interface GovernanceRuleFile {
  name: string;
  path: string;
}

export interface GovernanceRuleContent {
  file: GovernanceRuleFile;
  rawText: string;
}

export interface GovernanceSaveRequest {
  filePath: string;
  rawText: string;
}

export interface GovernanceSaveResult {
  ok: boolean;
  message: string;
  filePath?: string;
  backupPath?: string;
  reportPath?: string;
  stdout?: string;
  stderr?: string;
  code?: number;
}
