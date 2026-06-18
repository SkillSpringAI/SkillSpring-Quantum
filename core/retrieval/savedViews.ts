import path from "node:path";
import { fileExists, readJsonFile, writeTextFile } from "../utils/fs.js";
import { resolveOutputRoot } from "../utils/paths.js";

export interface RetrievalSavedViewFilters {
  text: string;
  vendor: string;
  topic: string;
  status: "all" | "imported" | "skipped" | "failed";
  from: string;
  to: string;
}

export interface RetrievalSavedRecordSelection {
  runAt: string;
  filePath: string;
}

export interface RetrievalSavedSegmentSelection {
  runId: string;
  conversationId: string;
  startIndex: number;
  endIndex: number;
}

export interface RetrievalSavedViewEntry {
  id: string;
  name: string;
  filters: RetrievalSavedViewFilters;
  selectedRecord?: RetrievalSavedRecordSelection;
  selectedSegment?: RetrievalSavedSegmentSelection;
  createdAt: string;
  updatedAt: string;
}

export interface RetrievalSavedViewsManifest {
  schemaVersion: "retrieval_saved_views.v1";
  updatedAt: string;
  outputRoot: string;
  views: RetrievalSavedViewEntry[];
}

export interface RetrievalSavedViewsResult {
  outputRoot: string;
  retrievalRoot: string;
  latestFile: string;
  latest: RetrievalSavedViewsManifest | null;
}

export interface SaveRetrievalViewInput {
  outputRoot: string;
  name: string;
  filters: RetrievalSavedViewFilters;
  selectedRecord?: RetrievalSavedRecordSelection;
  selectedSegment?: RetrievalSavedSegmentSelection;
}

export interface DeleteRetrievalViewInput {
  outputRoot: string;
  id: string;
}

export function savedViewsPath(outputRoot: string): string {
  return path.join(resolveOutputRoot(outputRoot), "retrieval", "saved-views.json");
}

export async function readSavedViews(outputRoot: string): Promise<RetrievalSavedViewsResult> {
  const normalizedRoot = resolveOutputRoot(outputRoot);
  const retrievalRoot = path.join(normalizedRoot, "retrieval");
  const latestFile = savedViewsPath(normalizedRoot);

  return {
    outputRoot: normalizedRoot,
    retrievalRoot,
    latestFile,
    latest: await readExistingSavedViews(latestFile)
  };
}

export async function saveRetrievalView(input: SaveRetrievalViewInput): Promise<RetrievalSavedViewsResult> {
  const outputRoot = resolveOutputRoot(input.outputRoot);
  const latestFile = savedViewsPath(outputRoot);
  const existing = await readExistingSavedViews(latestFile);
  const now = new Date().toISOString();
  const normalizedName = input.name.trim();

  const views = [...(existing?.views ?? [])];
  const existingIndex = views.findIndex((view) => view.name.toLowerCase() === normalizedName.toLowerCase());
  const viewId = existingIndex >= 0 ? views[existingIndex].id : nextAvailableViewId(views, normalizedName);
  const createdAt = existingIndex >= 0 ? views[existingIndex].createdAt : now;

  const nextView: RetrievalSavedViewEntry = {
    id: viewId,
    name: normalizedName,
    filters: { ...input.filters },
    selectedRecord: input.selectedRecord,
    selectedSegment: input.selectedSegment,
    createdAt,
    updatedAt: now
  };

  if (existingIndex >= 0) {
    views.splice(existingIndex, 1, nextView);
  } else {
    views.push(nextView);
  }

  const manifest: RetrievalSavedViewsManifest = {
    schemaVersion: "retrieval_saved_views.v1",
    updatedAt: now,
    outputRoot,
    views: views.sort((a, b) => a.name.localeCompare(b.name))
  };

  await writeTextFile(latestFile, JSON.stringify(manifest, null, 2));
  return readSavedViews(outputRoot);
}

export async function deleteRetrievalView(input: DeleteRetrievalViewInput): Promise<RetrievalSavedViewsResult> {
  const outputRoot = resolveOutputRoot(input.outputRoot);
  const latestFile = savedViewsPath(outputRoot);
  const existing = await readExistingSavedViews(latestFile);

  if (!existing) {
    return readSavedViews(outputRoot);
  }

  const manifest: RetrievalSavedViewsManifest = {
    ...existing,
    updatedAt: new Date().toISOString(),
    views: existing.views.filter((view) => view.id !== input.id)
  };

  await writeTextFile(latestFile, JSON.stringify(manifest, null, 2));
  return readSavedViews(outputRoot);
}

async function readExistingSavedViews(latestFile: string): Promise<RetrievalSavedViewsManifest | null> {
  if (!(await fileExists(latestFile))) {
    return null;
  }

  try {
    return await readJsonFile<RetrievalSavedViewsManifest>(latestFile);
  } catch {
    return null;
  }
}

function toViewId(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "saved-view";
}

function nextAvailableViewId(
  views: RetrievalSavedViewEntry[],
  name: string
): string {
  const baseId = toViewId(name);
  if (!views.some((view) => view.id === baseId)) {
    return baseId;
  }

  let counter = 2;
  while (views.some((view) => view.id === baseId + "-" + counter)) {
    counter += 1;
  }

  return baseId + "-" + counter;
}
