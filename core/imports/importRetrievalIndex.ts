import path from "node:path";
import { fileExists, readJsonFile, writeTextFile } from "../utils/fs.js";
import type {
  ImportRunFileResult,
  ImportRunSummary
} from "./sourceIntake.js";
import { sortSupportTiers, type ImportSupportTier } from "./importMetadata.js";

export interface ImportRetrievalIndexEntry {
  runAt: string;
  inputPath: string;
  filePath: string;
  kind: ImportRunFileResult["kind"];
  status: ImportRunFileResult["status"];
  message: string;
  sourceCategory?: "conversation" | "document";
  supportTier?: ImportSupportTier;
  conversationIds: string[];
  vendorSources: string[];
  titleHints: string[];
  topicHints: string[];
  searchText: string;
  startedAt?: string;
  endedAt?: string;
  conversationCount?: number;
  messageCount?: number;
  attachmentCount?: number;
  artifactLabels: string[];
  artifactPaths: string[];
  evidenceSources: string[];
  evidenceDetails: ImportRetrievalEvidenceDetail[];
  nextAction: "open_archive" | "open_dataset" | "review_outputs" | "open_source_file";
  nextActionLabel: string;
}

export interface ImportRetrievalEvidenceDetail {
  kind: "import_metadata" | "archive_output" | "dataset_output" | "attachment_evidence" | "source_file_path";
  label: string;
  detail: string;
}

export interface ImportRetrievalIndexManifest {
  schemaVersion: "import_retrieval_index.v1";
  generatedAt: string;
  outputRoot: string;
  runCount: number;
  entryCount: number;
  supportTiers: ImportSupportTier[];
  vendorSources: string[];
  topicHints: string[];
  startedAt?: string;
  endedAt?: string;
  runs: Array<{
    runAt: string;
    inputPath: string;
    retrievalSummary: ImportRunSummary["retrievalSummary"];
  }>;
  entries: ImportRetrievalIndexEntry[];
}

export async function writeImportRetrievalIndex(
  outputRoot: string,
  latestRun: ImportRunSummary
): Promise<{ latestPath: string; historyPath: string; manifest: ImportRetrievalIndexManifest }> {
  const importsRoot = path.join(outputRoot, "imports");
  const latestPath = path.join(importsRoot, "latest-retrieval-index.json");
  const historyDir = path.join(importsRoot, "retrieval-history");
  const historyPath = path.join(
    historyDir,
    "retrieval-index-" + latestRun.runAt.replace(/[:.]/g, "-") + ".json"
  );

  const existing = await readExistingIndex(latestPath);
  const next = mergeIndex(existing, outputRoot, latestRun);

  await writeTextFile(latestPath, JSON.stringify(next, null, 2));
  await writeTextFile(historyPath, JSON.stringify(next, null, 2));

  return { latestPath, historyPath, manifest: next };
}

function mergeIndex(
  existing: ImportRetrievalIndexManifest | null,
  outputRoot: string,
  latestRun: ImportRunSummary
): ImportRetrievalIndexManifest {
  const otherRuns = (existing?.runs ?? []).filter((run) => run.runAt !== latestRun.runAt);
  const otherEntries = (existing?.entries ?? []).filter((entry) => entry.runAt !== latestRun.runAt);
  const runEntries = latestRun.results.map((result) => toIndexEntry(latestRun, result));
  const runs = [
    {
      runAt: latestRun.runAt,
      inputPath: latestRun.inputPath,
      retrievalSummary: latestRun.retrievalSummary
    },
    ...otherRuns
  ].sort((a, b) => b.runAt.localeCompare(a.runAt));
  const entries = [...runEntries, ...otherEntries].sort((a, b) => b.runAt.localeCompare(a.runAt));

  const vendorSources = uniqueValues(entries.flatMap((entry) => entry.vendorSources)).sort();
  const supportTiers = sortSupportTiers(
    uniqueValues(
      entries
        .map((entry) => entry.supportTier)
        .filter((value): value is ImportSupportTier => Boolean(value))
    )
  );
  const topicHints = uniqueValues(entries.flatMap((entry) => entry.topicHints)).sort();
  const timestamps = entries
    .flatMap((entry) => [entry.startedAt, entry.endedAt])
    .filter((value): value is string => Boolean(value))
    .sort();

  return {
    schemaVersion: "import_retrieval_index.v1",
    generatedAt: new Date().toISOString(),
    outputRoot,
    runCount: runs.length,
    entryCount: entries.length,
    supportTiers,
    vendorSources,
    topicHints,
    startedAt: timestamps[0],
    endedAt: timestamps[timestamps.length - 1],
    runs,
    entries
  };
}

function toIndexEntry(
  run: ImportRunSummary,
  result: ImportRunFileResult
): ImportRetrievalIndexEntry {
  const metadata = result.metadata;
  const artifacts = result.artifacts ?? [];
  const artifactPaths = artifacts.map((artifact) => artifact.path);
  const artifactLabels = artifacts.map((artifact) => artifact.label);
  const evidenceSources = buildEvidenceSources(metadata, artifactLabels, artifactPaths);
  const evidenceDetails = buildEvidenceDetails(metadata, artifactLabels, artifactPaths);
  const nextAction = chooseNextAction(artifactLabels, artifactPaths, metadata?.sourceCategory);
  const nextActionLabel = formatNextActionLabel(nextAction);

  if (metadata?.sourceCategory === "conversation") {
    return {
      runAt: run.runAt,
      inputPath: run.inputPath,
      filePath: result.path,
      kind: result.kind,
      status: result.status,
      message: result.message,
      sourceCategory: "conversation",
      supportTier: metadata.supportTier,
      conversationIds: metadata.conversationIds,
      vendorSources: metadata.vendorSources,
      titleHints: metadata.sampleTitles,
      topicHints: metadata.topicHints,
      searchText: buildSearchText({
        filePath: result.path,
        inputPath: run.inputPath,
        message: result.message,
        vendorSources: metadata.vendorSources,
        titleHints: metadata.sampleTitles,
        topicHints: metadata.topicHints,
        artifactLabels,
        evidenceSources,
        evidenceDetails,
        nextActionLabel
      }),
      startedAt: metadata.startedAt,
      endedAt: metadata.endedAt,
      conversationCount: metadata.conversationCount,
      messageCount: metadata.messageCount,
      attachmentCount: metadata.attachmentCount,
      artifactLabels,
      artifactPaths,
      evidenceSources,
      evidenceDetails,
      nextAction,
      nextActionLabel
    };
  }

  return {
    runAt: run.runAt,
    inputPath: run.inputPath,
    filePath: result.path,
    kind: result.kind,
    status: result.status,
    message: result.message,
    sourceCategory: metadata?.sourceCategory,
    supportTier: metadata?.supportTier,
    conversationIds: [],
    vendorSources: [],
    titleHints: [],
    topicHints: [],
    searchText: buildSearchText({
      filePath: result.path,
      inputPath: run.inputPath,
      message: result.message,
      vendorSources: [],
      titleHints: [],
      topicHints: [],
      artifactLabels,
      evidenceSources,
      evidenceDetails,
      nextActionLabel
    }),
    artifactLabels,
    artifactPaths,
    evidenceSources,
    evidenceDetails,
    nextAction,
    nextActionLabel
  };
}

async function readExistingIndex(
  latestPath: string
): Promise<ImportRetrievalIndexManifest | null> {
  if (!(await fileExists(latestPath))) {
    return null;
  }

  try {
    return await readJsonFile<ImportRetrievalIndexManifest>(latestPath);
  } catch {
    return null;
  }
}

function uniqueValues<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function buildSearchText(input: {
  filePath: string;
  inputPath: string;
  message: string;
  vendorSources: string[];
  titleHints: string[];
  topicHints: string[];
  artifactLabels: string[];
  evidenceSources: string[];
  evidenceDetails: ImportRetrievalEvidenceDetail[];
  nextActionLabel: string;
}): string {
  return [
    input.filePath,
    input.inputPath,
    input.message,
    ...input.vendorSources,
    ...input.titleHints,
    ...input.topicHints,
    ...input.artifactLabels,
    ...input.evidenceSources,
    ...input.evidenceDetails.map((detail) => detail.label),
    ...input.evidenceDetails.map((detail) => detail.detail),
    input.nextActionLabel
  ]
    .join(" ")
    .toLowerCase();
}

function buildEvidenceSources(
  metadata: ImportRunFileResult["metadata"],
  artifactLabels: string[],
  artifactPaths: string[]
): string[] {
  return buildEvidenceDetails(metadata, artifactLabels, artifactPaths).map((detail) => detail.label.toLowerCase());
}

function buildEvidenceDetails(
  metadata: ImportRunFileResult["metadata"],
  artifactLabels: string[],
  artifactPaths: string[]
): ImportRetrievalEvidenceDetail[] {
  const sources: string[] = [];
  const details: ImportRetrievalEvidenceDetail[] = [];
  const joinedLabels = artifactLabels.join(" ").toLowerCase();
  const joinedPaths = artifactPaths.join(" ").toLowerCase();
  const vendorSources =
    metadata && "vendorSources" in metadata && Array.isArray(metadata.vendorSources)
      ? [...metadata.vendorSources]
      : [];
  const titleHints =
    metadata && "sampleTitles" in metadata && Array.isArray(metadata.sampleTitles)
      ? metadata.sampleTitles.filter((value): value is string => typeof value === "string")
      : [];
  const topicHints =
    metadata && "topicHints" in metadata && Array.isArray(metadata.topicHints)
      ? metadata.topicHints.filter((value): value is string => typeof value === "string")
      : [];

  if (metadata?.sourceCategory === "conversation") {
    details.push({
      kind: "import_metadata",
      label: "Import metadata",
      detail: [
        vendorSources.length > 0 ? `Vendor: ${vendorSources.join(", ")}` : "",
        titleHints.length > 0 ? `Title clues: ${titleHints.slice(0, 2).join(", ")}` : "",
        topicHints.length > 0 ? `Topic hints: ${topicHints.slice(0, 3).join(", ")}` : ""
      ]
        .filter(Boolean)
        .join(" | ")
    });
  }

  if (
    joinedLabels.includes("archived markdown") ||
    joinedLabels.includes("notification") ||
    joinedPaths.includes("\\source_archive\\") ||
    joinedPaths.includes("/source_archive/")
  ) {
    details.push({
      kind: "archive_output",
      label: "Archive output",
      detail: "Readable archive files were created, so this result can be checked in the archive review screen."
    });
  }

  if (
    joinedLabels.includes("dataset") ||
    joinedLabels.includes("topic segments") ||
    joinedLabels.includes("prompt/response") ||
    joinedPaths.includes("\\datasets\\") ||
    joinedPaths.includes("\\db\\") ||
    joinedPaths.includes("/datasets/") ||
    joinedPaths.includes("/db/")
  ) {
    details.push({
      kind: "dataset_output",
      label: "Dataset output",
      detail: "Structured dataset files or DB records were created, so this result can be checked in dataset review."
    });
  }

  const attachmentCount =
    metadata && "attachmentCount" in metadata && typeof metadata.attachmentCount === "number"
      ? metadata.attachmentCount
      : 0;

  if (attachmentCount > 0 || joinedLabels.includes("attachment")) {
    details.push({
      kind: "attachment_evidence",
      label: "Attachment evidence",
      detail:
        attachmentCount > 0
          ? `${attachmentCount} attachment reference(s) were detected for this record.`
          : "Attachment-related output was created for this record."
    });
  }

  if (details.length === 0) {
    details.push({
      kind: "source_file_path",
      label: "Source file path",
      detail: "The source file path is the main deterministic clue available for this result."
    });
  }

  return dedupeEvidenceDetails(details);
}

function dedupeEvidenceDetails(details: ImportRetrievalEvidenceDetail[]): ImportRetrievalEvidenceDetail[] {
  const seen = new Set<string>();
  const deduped: ImportRetrievalEvidenceDetail[] = [];

  for (const detail of details) {
    const key = `${detail.kind}|${detail.label}|${detail.detail}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(detail);
  }

  return deduped;
}

function chooseNextAction(
  artifactLabels: string[],
  artifactPaths: string[],
  sourceCategory?: "conversation" | "document"
): ImportRetrievalIndexEntry["nextAction"] {
  const joinedLabels = artifactLabels.join(" ").toLowerCase();
  const joinedPaths = artifactPaths.join(" ").toLowerCase();

  if (
    joinedLabels.includes("archived markdown") ||
    joinedPaths.includes("\\source_archive\\") ||
    joinedPaths.includes("/source_archive/")
  ) {
    return "open_archive";
  }

  if (
    joinedLabels.includes("dataset") ||
    joinedLabels.includes("topic segments") ||
    joinedLabels.includes("prompt/response") ||
    joinedPaths.includes("\\datasets\\") ||
    joinedPaths.includes("\\db\\") ||
    joinedPaths.includes("/datasets/") ||
    joinedPaths.includes("/db/")
  ) {
    return "open_dataset";
  }

  if (artifactLabels.length > 0 || artifactPaths.length > 0 || sourceCategory === "document") {
    return "review_outputs";
  }

  return "open_source_file";
}

function formatNextActionLabel(action: ImportRetrievalIndexEntry["nextAction"]): string {
  switch (action) {
    case "open_archive":
      return "Open Readable Archive next";
    case "open_dataset":
      return "Open Dataset View next";
    case "review_outputs":
      return "Review output files next";
    default:
      return "Open source file next";
  }
}
