import { sha256 } from "../utils/hash.js";
import {
  loadCurationRules,
  loadRedactionRules,
  loadReviewQueueRules,
  loadSignalThresholdRules,
  loadTopicFilterRules,
  loadTopicNormalizationRules
} from "./loadRules.js";

export interface ImportGovernanceSnapshot {
  fingerprint: string;
  topicNormalizationVersion: string;
  signalThresholdVersion: string;
  redactionVersion: string;
  topicFilterVersion: string;
  curationVersion: string;
  reviewQueueVersion: string;
}

export function loadImportGovernanceSnapshot(): ImportGovernanceSnapshot {
  const topicNormalizationRules = loadTopicNormalizationRules();
  const signalThresholdRules = loadSignalThresholdRules();
  const redactionRules = loadRedactionRules();
  const topicFilterRules = loadTopicFilterRules();
  const curationRules = loadCurationRules();
  const reviewQueueRules = loadReviewQueueRules();

  const snapshotPayload = {
    topicNormalizationRules,
    signalThresholdRules,
    redactionRules,
    topicFilterRules,
    curationRules,
    reviewQueueRules
  };

  return {
    fingerprint: sha256(JSON.stringify(snapshotPayload)),
    topicNormalizationVersion: topicNormalizationRules.version,
    signalThresholdVersion: signalThresholdRules.version,
    redactionVersion: redactionRules.version,
    topicFilterVersion: topicFilterRules.version,
    curationVersion: curationRules.version,
    reviewQueueVersion: reviewQueueRules.version
  };
}
