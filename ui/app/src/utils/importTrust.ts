import type { ImportRunFileResult, ImportRunSummary } from "../types/importHistory";

export function isPackageCompanionSkip(result: ImportRunFileResult): boolean {
  return (
    result.status === "skipped" &&
    result.message.toLowerCase().includes("companion file for")
  );
}

export function countPackageCompanionSkips(run: ImportRunSummary | null): number {
  if (!run) {
    return 0;
  }

  return run.results.filter(isPackageCompanionSkip).length;
}

export function countUnexpectedSkippedFiles(run: ImportRunSummary | null): number {
  if (!run) {
    return 0;
  }

  return Math.max(0, run.unsupportedFilesSkipped - countPackageCompanionSkips(run));
}

export function runNeedsAttention(run: ImportRunSummary | null): boolean {
  if (!run) {
    return false;
  }

  return (
    run.filesFailed > 0 ||
    countUnexpectedSkippedFiles(run) > 0 ||
    run.results.some((result) => result.status === "failed")
  );
}
