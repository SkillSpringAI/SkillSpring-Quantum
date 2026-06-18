import type { ImportRetrievalIndexEntry } from "../types/importRetrievalIndex";

export interface RetrievalRankingFilters {
  text: string;
  vendor: string;
  topic: string;
}

export interface RankedRetrievalEntry {
  entry: ImportRetrievalIndexEntry;
  score: number;
  reasons: string[];
}

export function rankRetrievalEntries(
  entries: ImportRetrievalIndexEntry[],
  filters: RetrievalRankingFilters
): RankedRetrievalEntry[] {
  return entries
    .map((entry) => ({
      entry,
      ...scoreEntry(entry, filters)
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.entry.runAt.localeCompare(a.entry.runAt);
    });
}

function scoreEntry(
  entry: ImportRetrievalIndexEntry,
  filters: RetrievalRankingFilters
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  const textTerms = tokenize(filters.text);
  const vendor = filters.vendor.trim().toLowerCase();
  const topic = filters.topic.trim().toLowerCase();
  const searchable = entry.searchText;
  const titleText = entry.titleHints.join(" ").toLowerCase();
  const topicText = entry.topicHints.join(" ").toLowerCase();

  if (vendor && entry.vendorSources.some((value) => value.toLowerCase() === vendor)) {
    score += 50;
    reasons.push("vendor match");
  }

  if (topic) {
    const exactTopic = entry.topicHints.some((value) => value.toLowerCase() === topic);
    const partialTopic = entry.topicHints.some((value) => value.toLowerCase().includes(topic));
    if (exactTopic) {
      score += 40;
      reasons.push("exact topic match");
    } else if (partialTopic) {
      score += 24;
      reasons.push("topic match");
    }
  }

  if (textTerms.length > 0) {
    let matchedTerms = 0;

    for (const term of textTerms) {
      if (titleText.includes(term)) {
        score += 20;
        matchedTerms += 1;
        continue;
      }

      if (topicText.includes(term)) {
        score += 14;
        matchedTerms += 1;
        continue;
      }

      if (searchable.includes(term)) {
        score += 8;
        matchedTerms += 1;
      }
    }

    if (matchedTerms > 0) {
      reasons.push(matchedTerms + " text term match" + (matchedTerms === 1 ? "" : "es"));
    }

    if (matchedTerms === textTerms.length && textTerms.length > 1) {
      score += 15;
      reasons.push("all terms matched");
    }
  }

  const recency = scoreRecency(entry);
  if (recency > 0) {
    score += recency;
    reasons.push("recent");
  }

  if ((entry.attachmentCount ?? 0) > 0) {
    score += 2;
  }

  return {
    score,
    reasons
  };
}

function scoreRecency(entry: ImportRetrievalIndexEntry): number {
  const timestamp = Date.parse(entry.endedAt ?? entry.startedAt ?? entry.runAt);
  if (Number.isNaN(timestamp)) return 0;

  const ageDays = (Date.now() - timestamp) / 86_400_000;
  if (ageDays <= 30) return 12;
  if (ageDays <= 90) return 8;
  if (ageDays <= 180) return 4;
  return 1;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2);
}
