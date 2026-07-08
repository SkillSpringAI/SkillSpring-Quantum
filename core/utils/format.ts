import { createHash } from "node:crypto";

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s\-_]/g, "")
    .replace(/[\s_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function safeFileStem(input: string, fallback = "untitled", maxLength = 96): string {
  const cleaned = slugify(input);
  const resolved = cleaned || fallback;

  if (resolved.length <= maxLength) {
    return resolved;
  }

  const hash = createHash("sha256").update(resolved).digest("hex").slice(0, 8);
  const truncatedLength = Math.max(16, maxLength - hash.length - 1);
  return resolved.slice(0, truncatedLength).replace(/_+$/g, "") + "_" + hash;
}

export function shortTitle(input: string, maxWords = 8): string {
  return input
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, maxWords)
    .join(" ");
}

export function datePrefix(iso?: string): string {
  if (!iso) return "unknown-date";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "unknown-date";
  return d.toISOString().slice(0, 10);
}

export function monthPrefix(iso?: string): string {
  if (!iso) return "unknown-month";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "unknown-month";
  return d.toISOString().slice(0, 7);
}
