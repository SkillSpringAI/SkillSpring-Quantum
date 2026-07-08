import path from "node:path";
import type { LocalIndexState } from "./state.js";
import { createEmptyState } from "./state.js";
import { ensureDir, readJsonFile, writeTextFile } from "../utils/fs.js";

const INDEX_FILE_NAME = "index.json";
type RuntimeCaches = {
  processedConversationIds: Set<string>;
  fingerprintByHash: Map<string, LocalIndexState["fingerprints"][number]>;
  aliasByPair: Map<string, LocalIndexState["alias_memory"][number]>;
  aliasMatches: Map<string, LocalIndexState["alias_memory"]>;
  groupByName: Map<string, LocalIndexState["groups"][number]>;
};

const runtimeCaches = new WeakMap<LocalIndexState, RuntimeCaches>();

function getRuntimeCaches(state: LocalIndexState): RuntimeCaches {
  let caches = runtimeCaches.get(state);
  if (caches) {
    return caches;
  }

  caches = {
    processedConversationIds: new Set(state.processedConversationIds),
    fingerprintByHash: new Map(state.fingerprints.map((record) => [record.hash, record])),
    aliasByPair: new Map(
      state.alias_memory.map((record) => [`${record.alias}|${record.canonical_topic}`, record])
    ),
    aliasMatches: new Map(),
    groupByName: new Map(state.groups.map((group) => [group.name, group]))
  };

  for (const record of state.alias_memory) {
    const matches = caches.aliasMatches.get(record.alias) ?? [];
    matches.push(record);
    caches.aliasMatches.set(record.alias, matches);
  }

  runtimeCaches.set(state, caches);
  return caches;
}

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
  const caches = getRuntimeCaches(state);
  let group = caches.groupByName.get(groupName);

  if (!group) {
    group = {
      name: groupName,
      aliases: [],
      conversationIds: [],
      filePaths: []
    };
    state.groups.push(group);
    caches.groupByName.set(groupName, group);
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
  const caches = getRuntimeCaches(state);
  const cleanedAlias = alias.trim().toLowerCase();
  if (!cleanedAlias || cleanedAlias === canonicalTopic) return;
  const aliasKey = `${cleanedAlias}|${canonicalTopic}`;
  const existing = caches.aliasByPair.get(aliasKey);

  if (existing) {
    existing.seen_count += 1;
    return;
  }

  const record = {
    alias: cleanedAlias,
    canonical_topic: canonicalTopic,
    seen_count: 1
  };
  state.alias_memory.push(record);
  caches.aliasByPair.set(aliasKey, record);
  const matches = caches.aliasMatches.get(cleanedAlias) ?? [];
  matches.push(record);
  caches.aliasMatches.set(cleanedAlias, matches);
}

export function resolveAliasMemory(
  state: LocalIndexState,
  rawTopic: string
): string | null {
  const caches = getRuntimeCaches(state);
  const cleaned = rawTopic.trim().toLowerCase();
  if (!cleaned) return null;
  const matches = caches.aliasMatches.get(cleaned) ?? [];
  if (matches.length === 0) return null;

  let best = matches[0];
  for (let index = 1; index < matches.length; index += 1) {
    if (matches[index].seen_count > best.seen_count) {
      best = matches[index];
    }
  }

  return best.canonical_topic ?? null;
}

export function hasProcessedConversationId(state: LocalIndexState, conversationId: string): boolean {
  return getRuntimeCaches(state).processedConversationIds.has(conversationId);
}

export function rememberProcessedConversationId(state: LocalIndexState, conversationId: string): void {
  const caches = getRuntimeCaches(state);
  if (caches.processedConversationIds.has(conversationId)) {
    return;
  }

  caches.processedConversationIds.add(conversationId);
  state.processedConversationIds.push(conversationId);
}

export function findFingerprintByHash(
  state: LocalIndexState,
  hash: string
): LocalIndexState["fingerprints"][number] | undefined {
  return getRuntimeCaches(state).fingerprintByHash.get(hash);
}

export function rememberFingerprint(
  state: LocalIndexState,
  record: LocalIndexState["fingerprints"][number]
): void {
  const caches = getRuntimeCaches(state);
  state.fingerprints.push(record);
  caches.fingerprintByHash.set(record.hash, record);
}
