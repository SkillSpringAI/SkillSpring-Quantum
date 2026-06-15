export interface TopicGroup {
  name: string;
  aliases: string[];
  conversationIds: string[];
  filePaths: string[];
}

export interface FingerprintRecord {
  hash: string;
  primaryFile: string;
  backupFile?: string;
}

export interface AliasMemoryRecord {
  alias: string;
  canonical_topic: string;
  seen_count: number;
}

export interface LocalIndexState {
  processedConversationIds: string[];
  groups: TopicGroup[];
  fingerprints: FingerprintRecord[];
  alias_memory: AliasMemoryRecord[];
}

export function createEmptyState(): LocalIndexState {
  return {
    processedConversationIds: [],
    groups: [],
    fingerprints: [],
    alias_memory: []
  };
}
