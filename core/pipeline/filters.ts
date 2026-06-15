export interface TopicFilterConfig {
  includeTopics: string[];
  excludeTopics: string[];
}

function splitCsv(input?: string): string[] {
  if (!input) return [];
  return input
    .split(",")
    .map(x => x.trim().toLowerCase())
    .filter(Boolean);
}

export function parseTopicFilters(argv: string[]): TopicFilterConfig {
  const includeArg = argv.find(x => x.startsWith("--include-topics="));
  const excludeArg = argv.find(x => x.startsWith("--exclude-topics="));

  return {
    includeTopics: splitCsv(includeArg?.split("=")[1]),
    excludeTopics: splitCsv(excludeArg?.split("=")[1])
  };
}

export function isTopicAllowed(
  topic: string,
  config: TopicFilterConfig
): boolean {
  const normalized = topic.toLowerCase();

  if (config.includeTopics.length > 0 && !config.includeTopics.includes(normalized)) {
    return false;
  }

  if (config.excludeTopics.includes(normalized)) {
    return false;
  }

  return true;
}
