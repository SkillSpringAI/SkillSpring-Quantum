export interface GovernanceComposerResult {
  ok: boolean;
  message: string;
  generatedJson: string;
}

export interface GovernanceComposerInput {
  ruleFileName: string;
  instruction: string;
  currentJson?: string;
}
