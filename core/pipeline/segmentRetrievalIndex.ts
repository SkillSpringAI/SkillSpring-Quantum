import path from "node:path";
import { fileExists, readJsonFile, writeTextFile } from "../utils/fs.js";

export interface SegmentRetrievalIndexEntry {
  runId: string;
  conversationId: string;
  source: string;
  title?: string;
  topic: string;
  rawTopic: string;
  createdAt?: string;
  startIndex: number;
  endIndex: number;
  messageCount: number;
  signalTier: string;
  signalScore: number;
  redactionCount: number;
  textPreview: string;
  text: string;
  artifactPaths: string[];
  searchText: string;
}

export interface SegmentRetrievalIndexManifest {
  schemaVersion: "segment_retrieval_index.v1";
  generatedAt: string;
  outputRoot: string;
  runCount: number;
  entryCount: number;
  topics: string[];
  sources: string[];
  startedAt?: string;
  endedAt?: string;
  entries: SegmentRetrievalIndexEntry[];
}

export async function writeSegmentRetrievalIndex(
  outputRoot: string,
  runId: string,
  entries: SegmentRetrievalIndexEntry[]
): Promise<{ latestPath: string; historyPath: string; manifest: SegmentRetrievalIndexManifest }> {
  const retrievalRoot = path.join(outputRoot, "retrieval");
  const latestPath = path.join(retrievalRoot, "latest-segment-index.json");
  const historyPath = path.join(retrievalRoot, "history", "segment-index-" + runId + ".json");

  const existing = await readExistingIndex(latestPath);
  const next = mergeIndex(existing, outputRoot, runId, entries);

  await writeTextFile(latestPath, JSON.stringify(next, null, 2));
  await writeTextFile(historyPath, JSON.stringify(next, null, 2));

  return { latestPath, historyPath, manifest: next };
}

function mergeIndex(
  existing: SegmentRetrievalIndexManifest | null,
  outputRoot: string,
  runId: string,
  latestEntries: SegmentRetrievalIndexEntry[]
): SegmentRetrievalIndexManifest {
  const otherEntries = (existing?.entries ?? []).filter((entry) => entry.runId !== runId);
  const entries = [...latestEntries, ...otherEntries];
  const topics = uniqueValues(entries.map((entry) => entry.topic)).sort();
  const sources = uniqueValues(entries.map((entry) => entry.source)).sort();
  const timestamps = entries
    .map((entry) => entry.createdAt)
    .filter((value): value is string => Boolean(value))
    .sort();
  const runCount = uniqueValues(entries.map((entry) => entry.runId)).length;

  return {
    schemaVersion: "segment_retrieval_index.v1",
    generatedAt: new Date().toISOString(),
    outputRoot,
    runCount,
    entryCount: entries.length,
    topics,
    sources,
    startedAt: timestamps[0],
    endedAt: timestamps[timestamps.length - 1],
    entries
  };
}

async function readExistingIndex(
  latestPath: string
): Promise<SegmentRetrievalIndexManifest | null> {
  if (!(await fileExists(latestPath))) {
    return null;
  }

  try {
    return await readJsonFile<SegmentRetrievalIndexManifest>(latestPath);
  } catch {
    return null;
  }
}

function uniqueValues<T>(values: T[]): T[] {
  return [...new Set(values)];
}
