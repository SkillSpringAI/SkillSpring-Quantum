import type { DatasetRunResult } from "../types/datasetRun";
import type { MarkdownArchiveFile } from "../types/markdownArchive";

export type DatasetPreviewIntentKind =
  | "topic_segments"
  | "prompt_response_pairs"
  | "micro_segments"
  | "private_review";

export interface DatasetInvestigationIntent {
  vendor?: string;
  topic?: string;
  rawTopic?: string;
  createdAt?: string;
  archiveTitle?: string;
  archivePath?: string;
  supportTier?: MarkdownArchiveFile["supportTier"];
  hasAttachmentReferences?: boolean;
  hasPreservedAttachments?: boolean;
  hasMissingAttachments?: boolean;
  preferredPreviewKind?: DatasetPreviewIntentKind;
  previewReason?: string;
}

export interface DatasetRunMatchResult {
  run: DatasetRunResult["runs"][number] | null;
  score: number;
  matchedVendor: boolean;
  matchedTopic: boolean;
}

export function findMatchingDatasetRun(
  runs: DatasetRunResult["runs"],
  intent: DatasetInvestigationIntent
): DatasetRunResult["runs"][number] | null {
  return findMatchingDatasetRunDetails(runs, intent).run;
}

export function findMatchingDatasetRunDetails(
  runs: DatasetRunResult["runs"],
  intent: DatasetInvestigationIntent
): DatasetRunMatchResult {
  const normalizedVendor = intent.vendor?.trim().toLowerCase() ?? "";
  const topicCandidates = [intent.topic, intent.rawTopic]
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => value.trim().toLowerCase());

  const scoredRuns = runs.map((run) => {
    let score = 0;
    const sourceContext = run.source_context;
    const matchedVendor =
      !!normalizedVendor &&
      !!sourceContext?.vendor_sources.some((vendor) => vendor.toLowerCase() === normalizedVendor);
    const matchedTopic =
      topicCandidates.length > 0 &&
      !!sourceContext?.topic_hints.some((topic) =>
        topicCandidates.some((candidate) => matchesTopicCandidate(topic, candidate))
      );

    if (matchedVendor) {
      score += 3;
    }

    if (matchedTopic) {
      score += 2;
    }

    return { run, score, matchedVendor, matchedTopic };
  });

  scoredRuns.sort((left, right) => right.score - left.score || right.run.run_id.localeCompare(left.run.run_id));
  const best = scoredRuns[0];

  return {
    run: best?.score ? best.run : runs[0] ?? null,
    score: best?.score ?? 0,
    matchedVendor: best?.score ? best.matchedVendor : false,
    matchedTopic: best?.score ? best.matchedTopic : false
  };
}

function matchesTopicCandidate(topicHint: string, candidate: string): boolean {
  const normalizedTopic = topicHint.toLowerCase();
  const normalizedCandidate = candidate.toLowerCase();

  if (
    normalizedTopic.includes(normalizedCandidate) ||
    normalizedCandidate.includes(normalizedTopic)
  ) {
    return true;
  }

  const topicTokens = tokenize(normalizedTopic).map(normalizeToken);
  const candidateTokens = tokenize(normalizedCandidate).map(normalizeToken);

  return candidateTokens.some((candidateToken) => topicTokens.includes(candidateToken));
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2);
}

function normalizeToken(token: string): string {
  const cleaned = token.toLowerCase().trim();
  if (cleaned.length <= 4) {
    return cleaned;
  }

  if (cleaned.endsWith("ies")) {
    return cleaned.slice(0, -3) + "y";
  }

  if (cleaned.endsWith("ing") && cleaned.length > 5) {
    return cleaned.slice(0, -3);
  }

  if (cleaned.endsWith("es") && cleaned.length > 4) {
    return cleaned.slice(0, -2);
  }

  if (cleaned.endsWith("s") && !cleaned.endsWith("ss") && cleaned.length > 4) {
    return cleaned.slice(0, -1);
  }

  return cleaned;
}
