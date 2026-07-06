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
  const pathText = [entry.filePath, entry.inputPath].join(" ").toLowerCase();
  const evidenceText = [
    ...(entry.evidenceSources ?? []),
    ...(entry.evidenceDetails?.map((detail) => `${detail.label} ${detail.detail}`) ?? [])
  ]
    .join(" ")
    .toLowerCase();

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
    let titleMatches = 0;
    let topicMatches = 0;
    let pathMatches = 0;
    let evidenceMatches = 0;

    for (const term of textTerms) {
      if (matchesNormalizedTerm(titleText, term)) {
        score += 20;
        matchedTerms += 1;
        titleMatches += 1;
        continue;
      }

      if (matchesNormalizedTerm(topicText, term)) {
        score += 14;
        matchedTerms += 1;
        topicMatches += 1;
        continue;
      }

      if (matchesNormalizedTerm(pathText, term)) {
        score += 10;
        matchedTerms += 1;
        pathMatches += 1;
        continue;
      }

      if (matchesNormalizedTerm(evidenceText, term)) {
        score += 9;
        matchedTerms += 1;
        evidenceMatches += 1;
        continue;
      }

      if (matchesNormalizedTerm(searchable, term)) {
        score += 8;
        matchedTerms += 1;
      }
    }

    pushFieldMatchReason(reasons, titleMatches, "title clue", "title clues");
    pushFieldMatchReason(reasons, topicMatches, "topic clue", "topic clues");
    pushFieldMatchReason(reasons, pathMatches, "path clue", "path clues");
    pushFieldMatchReason(reasons, evidenceMatches, "evidence clue", "evidence clues");

    if (matchedTerms > 0 && titleMatches + topicMatches + pathMatches + evidenceMatches === 0) {
      reasons.push(matchedTerms + " broad text match" + (matchedTerms === 1 ? "" : "es"));
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
