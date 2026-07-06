import type { SegmentRetrievalIndexEntry } from "../types/segmentRetrievalIndex";

export interface SegmentRankingFilters {
  text: string;
  topic: string;
  vendor: string;
}

export interface RankedSegmentEntry {
  entry: SegmentRetrievalIndexEntry;
  score: number;
  reasons: string[];
}

export function rankSegmentEntries(
  entries: SegmentRetrievalIndexEntry[],
  filters: SegmentRankingFilters
): RankedSegmentEntry[] {
  return entries
    .map((entry) => ({
      entry,
      ...scoreSegment(entry, filters)
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (b.entry.createdAt ?? "").localeCompare(a.entry.createdAt ?? "");
    });
}

function scoreSegment(
  entry: SegmentRetrievalIndexEntry,
  filters: SegmentRankingFilters
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  const textTerms = tokenize(filters.text);
  const topic = filters.topic.trim().toLowerCase();
  const vendor = filters.vendor.trim().toLowerCase();

  if (vendor && entry.source.toLowerCase() === vendor) {
    score += 45;
    reasons.push("source match");
  }

  if (topic) {
    const summary = (entry.summaryLabel ?? "").toLowerCase();

    if (entry.topic.toLowerCase() === topic || summary === topic) {
      score += 40;
      reasons.push("exact topic match");
    } else if (
      entry.topic.toLowerCase().includes(topic) ||
      entry.rawTopic.toLowerCase().includes(topic) ||
      summary.includes(topic)
    ) {
      score += 20;
      reasons.push("topic match");
    }
  }

  if (textTerms.length > 0) {
    let matched = 0;
    let summaryMatches = 0;
    let topicMatches = 0;
    let titleMatches = 0;

    for (const term of textTerms) {
      if (matchesNormalizedTerm((entry.summaryLabel ?? "").toLowerCase(), term)) {
        score += 20;
        matched += 1;
        summaryMatches += 1;
        continue;
      }

      if (matchesNormalizedTerm(entry.topic.toLowerCase(), term)) {
        score += 16;
        matched += 1;
        topicMatches += 1;
        continue;
      }

      if (matchesNormalizedTerm((entry.title ?? "").toLowerCase(), term)) {
        score += 18;
        matched += 1;
        titleMatches += 1;
        continue;
      }

      if (matchesNormalizedTerm(entry.searchText, term)) {
        score += 8;
        matched += 1;
      }
    }

    pushFieldMatchReason(reasons, summaryMatches, "summary clue", "summary clues");
    pushFieldMatchReason(reasons, topicMatches, "topic clue", "topic clues");
    pushFieldMatchReason(reasons, titleMatches, "title clue", "title clues");

    if (matched > 0 && summaryMatches + topicMatches + titleMatches === 0) {
      reasons.push(matched + " broad text match" + (matched === 1 ? "" : "es"));
    }

    if (matched === textTerms.length && textTerms.length > 1) {
      score += 12;
      reasons.push("all terms matched");
    }
  }

  if (entry.signalTier === "high_signal") {
    score += 10;
    reasons.push("high signal");
  } else if (entry.signalTier === "low_signal") {
    score += 4;
  }

  if (entry.importance === "high") {
    score += 10;
    reasons.push("high importance");
  } else if (entry.importance === "medium") {
    score += 5;
  }

  score += Math.min(12, Math.round(entry.signalScore / 10));

  return { score, reasons };
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2);
}

function matchesNormalizedTerm(text: string, term: string): boolean {
  if (text.includes(term)) {
    return true;
  }

  const normalizedHaystack = tokenize(text).map(normalizeToken);
  const normalizedNeedle = normalizeToken(term);
  return normalizedHaystack.includes(normalizedNeedle);
}

function normalizeToken(token: string): string {
  const cleaned = token.toLowerCase().trim();
  if (cleaned.length <= 4) {
    return cleaned;
  }

  if (cleaned.endsWith("ies")) {
    return cleaned.slice(0, -3) + "y";
  }

  if (cleaned.endsWith("ing") && cleaned.length > 5) {
    return cleaned.slice(0, -3);
  }

  if (cleaned.endsWith("es") && cleaned.length > 4) {
    return cleaned.slice(0, -2);
  }

  if (cleaned.endsWith("s") && !cleaned.endsWith("ss") && cleaned.length > 4) {
    return cleaned.slice(0, -1);
  }

  return cleaned;
}

function pushFieldMatchReason(reasons: string[], count: number, singular: string, plural: string): void {
  if (count <= 0) {
    return;
  }

  reasons.push(`${count} ${count === 1 ? singular : plural}`);
}
