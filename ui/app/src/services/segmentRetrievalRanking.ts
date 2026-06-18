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
    if (entry.topic.toLowerCase() === topic) {
      score += 40;
      reasons.push("exact topic match");
    } else if (entry.topic.toLowerCase().includes(topic) || entry.rawTopic.toLowerCase().includes(topic)) {
      score += 20;
      reasons.push("topic match");
    }
  }

  if (textTerms.length > 0) {
    let matched = 0;

    for (const term of textTerms) {
      if (entry.topic.toLowerCase().includes(term)) {
        score += 16;
        matched += 1;
        continue;
      }

      if ((entry.title ?? "").toLowerCase().includes(term)) {
        score += 18;
        matched += 1;
        continue;
      }

      if (entry.searchText.includes(term)) {
        score += 8;
        matched += 1;
      }
    }

    if (matched > 0) {
      reasons.push(matched + " text term match" + (matched === 1 ? "" : "es"));
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
