/**
 * Working Memory
 * Fast in-memory key-value store with TTL support
 */

import type { WorkingMemoryItem } from "../types/index.js";

type InternalWorkingMemoryItem = Omit<WorkingMemoryItem, "expires_at"> & { expires_at?: number };

export class WorkingMemory {
  private items: Map<string, InternalWorkingMemoryItem> = new Map();
  private maxItems: number;
  private defaultTtlSeconds: number;

  constructor(config?: { maxItems?: number; defaultTtlSeconds?: number }) {
    this.maxItems = config?.maxItems ?? 100;
    this.defaultTtlSeconds = config?.defaultTtlSeconds ?? 3600;
  }

  set(key: string, value: string, category: WorkingMemoryItem["category"] = "context", ttlSeconds?: number): void {
    const now = Date.now();
    const item: InternalWorkingMemoryItem = {
      key,
      value,
      category,
      created_at: new Date(now).toISOString(),
      expires_at: ttlSeconds !== undefined && ttlSeconds > 0 ? now + ttlSeconds * 1000 : undefined,
    };

    // Evict oldest if at capacity
    if (this.items.size >= this.maxItems && !this.items.has(key)) {
      const oldest = this.items.keys().next().value;
      if (oldest) this.items.delete(oldest);
    }

    this.items.set(key, item);
  }

  get(key: string): WorkingMemoryItem | null {
    this.cleanup();
    const item = this.items.get(key);
    if (!item) return null;
    return {
      key: item.key,
      value: item.value,
      category: item.category,
      created_at: item.created_at,
      expires_at: item.expires_at ? new Date(item.expires_at).toISOString() : undefined,
    };
  }

  getByCategory(category: WorkingMemoryItem["category"]): WorkingMemoryItem[] {
    this.cleanup();
    return Array.from(this.items.values())
      .filter((i) => i.category === category)
      .map((i) => ({
        key: i.key,
        value: i.value,
        category: i.category,
        created_at: i.created_at,
        expires_at: i.expires_at ? new Date(i.expires_at).toISOString() : undefined,
      }));
  }

  delete(key: string): boolean {
    return this.items.delete(key);
  }

  clear(): void {
    this.items.clear();
  }

  all(): WorkingMemoryItem[] {
    this.cleanup();
    return Array.from(this.items.values()).map((i) => ({
      key: i.key,
      value: i.value,
      category: i.category,
      created_at: i.created_at,
      expires_at: i.expires_at ? new Date(i.expires_at).toISOString() : undefined,
    }));
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.items) {
      if (item.expires_at && now > item.expires_at) {
        this.items.delete(key);
      }
    }
  }
}
