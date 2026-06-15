import { loadTopicFilterRules } from "../governance/loadRules.js";

export interface TopicFilterDecision {
  allowed: boolean;
  reason: string;
}

export function shouldIncludeTopic(topic: string): TopicFilterDecision {
  const rules = loadTopicFilterRules();
  const normalized = topic.trim().toLowerCase();

  if (rules.exclude_general_by_default && normalized === "general") {
    return {
      allowed: false,
      reason: "general topic excluded by default"
    };
  }

  if (rules.exclude_topics.map(x => x.toLowerCase()).includes(normalized)) {
    return {
      allowed: false,
      reason: "topic matched exclude list"
    };
  }

  if (rules.include_topics.length > 0) {
    const allowed = rules.include_topics.map(x => x.toLowerCase()).includes(normalized);
    return {
      allowed,
      reason: allowed ? "topic matched include list" : "topic not present in include list"
    };
  }

  return {
    allowed: true,
    reason: "topic allowed by default"
  };
}
