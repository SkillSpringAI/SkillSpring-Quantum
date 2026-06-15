import { loadTopicNormalizationRules } from "../governance/loadRules.js";

export interface TopicScoreResult {
  topic: string;
  score: number;
  matchedKeywords: string[];
}

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map(x => x.trim())
    .filter(Boolean);
}

export function scoreCanonicalTopics(text: string): TopicScoreResult[] {
  const rules = loadTopicNormalizationRules();
  const tokens = tokenize(text);
  const joined = " " + tokens.join(" ") + " ";

  const results: TopicScoreResult[] = [];

  for (const [topic, keywords] of Object.entries(rules.canonical_topics)) {
    const matchedKeywords = keywords.filter(keyword => {
      const k = keyword.toLowerCase().trim();
      return joined.includes(" " + k + " ") || tokens.includes(k);
    });

    if (matchedKeywords.length > 0) {
      results.push({
        topic,
        score: matchedKeywords.length,
        matchedKeywords
      });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}
