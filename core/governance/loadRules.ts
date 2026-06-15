import topicRules from "../../governance/rules/topic-normalization-rules.json" with { type: "json" };
import wasteRules from "../../governance/rules/waste-rules.json" with { type: "json" };
import signalRules from "../../governance/rules/signal-thresholds.json" with { type: "json" };
import redactionRules from "../../governance/rules/redaction-rules.json" with { type: "json" };
import topicFilterRules from "../../governance/rules/topic-filter-rules.json" with { type: "json" };
import curationRules from "../../governance/rules/curation-rules.json" with { type: "json" };
import reviewQueueRules from "../../governance/rules/review-queue-rules.json" with { type: "json" };
import reviewDecisionRules from "../../governance/rules/review-decision-rules.json" with { type: "json" };

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

export function loadTopicNormalizationRules(): TopicNormalizationRules {
  return topicRules as TopicNormalizationRules;
}

export function loadWasteRules(): WasteRules {
  return wasteRules as WasteRules;
}

export function loadSignalThresholdRules(): SignalThresholdRules {
  return signalRules as SignalThresholdRules;
}

export function loadRedactionRules(): RedactionRules {
  return redactionRules as RedactionRules;
}

export function loadTopicFilterRules(): TopicFilterRules {
  return topicFilterRules as TopicFilterRules;
}

export function loadCurationRules(): CurationRules {
  return curationRules as CurationRules;
}

export function loadReviewQueueRules(): ReviewQueueRules {
  return reviewQueueRules as ReviewQueueRules;
}

export function loadReviewDecisionRules(): ReviewDecisionRules {
  return reviewDecisionRules as ReviewDecisionRules;
}
