export function normalizeForFingerprint(input: string): string {
  return input
    .toLowerCase()
    .replace(/\[redacted_[a-z]+\]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenSet(input: string): Set<string> {
  return new Set(
    normalizeForFingerprint(input)
      .split(" ")
      .map(x => x.trim())
      .filter(x => x.length > 2)
  );
}

export function jaccardSimilarity(a: string, b: string): number {
  const setA = tokenSet(a);
  const setB = tokenSet(b);

  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection += 1;
  }

  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}
