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
  nextAction: "open_archive" | "open_dataset" | "review_outputs" | "open_source_file";
  nextActionLabel: string;
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
      nextActionLabel
    }),
    artifactLabels,
    artifactPaths,
    evidenceSources,
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
  const sources: string[] = [];
  const joinedLabels = artifactLabels.join(" ").toLowerCase();
  const joinedPaths = artifactPaths.join(" ").toLowerCase();

  if (metadata?.sourceCategory === "conversation") {
    sources.push("import metadata");
  }

  if (
    joinedLabels.includes("archived markdown") ||
    joinedLabels.includes("notification") ||
    joinedPaths.includes("\\source_archive\\") ||
    joinedPaths.includes("/source_archive/")
  ) {
    sources.push("archive output");
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
    sources.push("dataset output");
  }

  const attachmentCount =
    metadata && "attachmentCount" in metadata && typeof metadata.attachmentCount === "number"
      ? metadata.attachmentCount
      : 0;

  if (attachmentCount > 0 || joinedLabels.includes("attachment")) {
    sources.push("attachment evidence");
  }

  if (sources.length === 0) {
    sources.push("source file path");
  }

  return uniqueValues(sources);
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
