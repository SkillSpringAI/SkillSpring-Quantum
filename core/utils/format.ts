export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s\-_]/g, "")
    .replace(/[\s_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function safeFileStem(input: string, fallback = "untitled"): string {
  const cleaned = slugify(input);
  return cleaned || fallback;
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
