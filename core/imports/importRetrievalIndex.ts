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
  artifactPaths: string[];
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
        topicHints: metadata.topicHints
      }),
      startedAt: metadata.startedAt,
      endedAt: metadata.endedAt,
      conversationCount: metadata.conversationCount,
      messageCount: metadata.messageCount,
      attachmentCount: metadata.attachmentCount,
      artifactPaths: result.artifacts?.map((artifact) => artifact.path) ?? []
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
      topicHints: []
    }),
    artifactPaths: result.artifacts?.map((artifact) => artifact.path) ?? []
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
}): string {
  return [
    input.filePath,
    input.inputPath,
    input.message,
    ...input.vendorSources,
    ...input.titleHints,
    ...input.topicHints
  ]
    .join(" ")
    .toLowerCase();
}
