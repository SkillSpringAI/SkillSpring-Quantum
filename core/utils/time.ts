export function millisecondsBetween(startIso?: string, endIso?: string): number | undefined {
  if (!startIso || !endIso) return undefined;

  const start = Date.parse(startIso);
  const end = Date.parse(endIso);

  if (!Number.isFinite(start) || !Number.isFinite(end)) return undefined;

  return Math.max(0, end - start);
}

export function formatRelativeTimestamp(startIso?: string, currentIso?: string): string {
  const diffMs = millisecondsBetween(startIso, currentIso);
  if (diffMs === undefined) return "unknown";

  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return "+" + hours + "h " + minutes + "m " + seconds + "s";
  }

  if (minutes > 0) {
    return "+" + minutes + "m " + seconds + "s";
  }

  return "+" + seconds + "s";
}
