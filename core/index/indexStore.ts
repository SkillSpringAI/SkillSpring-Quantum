import path from "node:path";
import type { LocalIndexState } from "./state.js";
import { createEmptyState } from "./state.js";
import { ensureDir, readJsonFile, writeTextFile } from "../utils/fs.js";

const INDEX_FILE_NAME = "index.json";

export async function loadIndex(rootOutputDir: string): Promise<LocalIndexState> {
  const indexPath = path.join(rootOutputDir, INDEX_FILE_NAME);

  try {
    const loaded = await readJsonFile<LocalIndexState>(indexPath);
    return {
      processedConversationIds: loaded.processedConversationIds ?? [],
      groups: loaded.groups ?? [],
      fingerprints: loaded.fingerprints ?? [],
      alias_memory: loaded.alias_memory ?? []
    };
  } catch {
    return createEmptyState();
  }
}

export async function saveIndex(rootOutputDir: string, state: LocalIndexState): Promise<void> {
  await ensureDir(rootOutputDir);
  const indexPath = path.join(rootOutputDir, INDEX_FILE_NAME);
  await writeTextFile(indexPath, JSON.stringify(state, null, 2));
}

export function upsertGroup(
  state: LocalIndexState,
  groupName: string,
  alias: string,
  conversationId: string,
  filePath: string
): void {
  let group = state.groups.find(g => g.name === groupName);

  if (!group) {
    group = {
      name: groupName,
      aliases: [],
      conversationIds: [],
      filePaths: []
    };
    state.groups.push(group);
  }

  if (alias && !group.aliases.includes(alias)) {
    group.aliases.push(alias);
  }

  if (!group.conversationIds.includes(conversationId)) {
    group.conversationIds.push(conversationId);
  }

  if (!group.filePaths.includes(filePath)) {
    group.filePaths.push(filePath);
  }
}

export function rememberAlias(
  state: LocalIndexState,
  alias: string,
  canonicalTopic: string
): void {
  const cleanedAlias = alias.trim().toLowerCase();
  if (!cleanedAlias || cleanedAlias === canonicalTopic) return;

  const existing = state.alias_memory.find(
    x => x.alias === cleanedAlias && x.canonical_topic === canonicalTopic
  );

  if (existing) {
    existing.seen_count += 1;
    return;
  }

  state.alias_memory.push({
    alias: cleanedAlias,
    canonical_topic: canonicalTopic,
    seen_count: 1
  });
}

export function resolveAliasMemory(
  state: LocalIndexState,
  rawTopic: string
): string | null {
  const cleaned = rawTopic.trim().toLowerCase();
  if (!cleaned) return null;

  const matches = state.alias_memory
    .filter(x => x.alias === cleaned)
    .sort((a, b) => b.seen_count - a.seen_count);

  return matches[0]?.canonical_topic ?? null;
}
