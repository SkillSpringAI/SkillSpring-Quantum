import path from "node:path";
import { readFileSync } from "node:fs";
import topicRulesFallback from "../../governance/rules/topic-normalization-rules.json" with { type: "json" };
import wasteRulesFallback from "../../governance/rules/waste-rules.json" with { type: "json" };
import signalRulesFallback from "../../governance/rules/signal-thresholds.json" with { type: "json" };
import redactionRulesFallback from "../../governance/rules/redaction-rules.json" with { type: "json" };
import topicFilterRulesFallback from "../../governance/rules/topic-filter-rules.json" with { type: "json" };
import curationRulesFallback from "../../governance/rules/curation-rules.json" with { type: "json" };
import reviewQueueRulesFallback from "../../governance/rules/review-queue-rules.json" with { type: "json" };
import reviewDecisionRulesFallback from "../../governance/rules/review-decision-rules.json" with { type: "json" };

import type {
  TopicNormalizationRules,
  WasteRules,
  SignalThresholdRules,
  RedactionRules,
  TopicFilterRules,
  CurationRules,
  ReviewQueueRules,
  ReviewDecisionRules
} from "./types.js";

function governanceRulesRoot(): string {
  const configured = process.env.SSQ_GOVERNANCE_ROOT?.trim();
  return configured
    ? path.resolve(configured)
    : path.resolve("governance", "rules");
}

function loadRuleFromFsOrFallback<T>(fileName: string, fallback: T): T {
  const filePath = path.join(governanceRulesRoot(), fileName);

  try {
    const raw = readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadTopicNormalizationRules(): TopicNormalizationRules {
  return loadRuleFromFsOrFallback("topic-normalization-rules.json", topicRulesFallback as TopicNormalizationRules);
}

export function loadWasteRules(): WasteRules {
  return loadRuleFromFsOrFallback("waste-rules.json", wasteRulesFallback as WasteRules);
}

export function loadSignalThresholdRules(): SignalThresholdRules {
  return loadRuleFromFsOrFallback("signal-thresholds.json", signalRulesFallback as SignalThresholdRules);
}

export function loadRedactionRules(): RedactionRules {
  return loadRuleFromFsOrFallback("redaction-rules.json", redactionRulesFallback as RedactionRules);
}

export function loadTopicFilterRules(): TopicFilterRules {
  return loadRuleFromFsOrFallback("topic-filter-rules.json", topicFilterRulesFallback as TopicFilterRules);
}

export function loadCurationRules(): CurationRules {
  return loadRuleFromFsOrFallback("curation-rules.json", curationRulesFallback as CurationRules);
}

export function loadReviewQueueRules(): ReviewQueueRules {
  return loadRuleFromFsOrFallback("review-queue-rules.json", reviewQueueRulesFallback as ReviewQueueRules);
}

export function loadReviewDecisionRules(): ReviewDecisionRules {
  return loadRuleFromFsOrFallback("review-decision-rules.json", reviewDecisionRulesFallback as ReviewDecisionRules);
}
