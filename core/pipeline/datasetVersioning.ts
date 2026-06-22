import path from "node:path";

export interface DatasetPaths {
  runId: string;
  manifestsDir: string;
  runsDir: string;
  topicSegmentsFile: string;
  promptResponsePairsFile: string;
  microSegmentsFile: string;
  currentTopicSegmentsFile: string;
  currentPromptResponsePairsFile: string;
  currentMicroSegmentsFile: string;
  runTopicSegmentsFile: string;
  runPromptResponsePairsFile: string;
  runMicroSegmentsFile: string;
  runPrivateReviewFile: string;
  manifestFile: string;
}

function safeTimestamp(date: Date): string {
  return date.toISOString().replace(/[:.]/g, "-");
}

export function buildDatasetPaths(rootOutputDir: string, version = "v1"): DatasetPaths {
  const runId = "run-" + safeTimestamp(new Date());

  const datasetsRoot = path.join(rootOutputDir, "datasets");
  const manifestsDir = path.join(datasetsRoot, "manifests");
  const runsDir = path.join(datasetsRoot, "runs");

  const topicSegmentsDir = path.join(datasetsRoot, "topic_segments", version);
  const promptResponseDir = path.join(datasetsRoot, "prompt_response_pairs", version);
  const microSegmentsDir = path.join(datasetsRoot, "micro_segments", version);

  const currentDir = path.join(datasetsRoot, "current");
  const runDir = path.join(runsDir, runId);

  return {
    runId,
    manifestsDir,
    runsDir,
    topicSegmentsFile: path.join(topicSegmentsDir, "data.jsonl"),
    promptResponsePairsFile: path.join(promptResponseDir, "data.jsonl"),
    microSegmentsFile: path.join(microSegmentsDir, "data.jsonl"),
    currentTopicSegmentsFile: path.join(currentDir, "topic_segments.jsonl"),
    currentPromptResponsePairsFile: path.join(currentDir, "prompt_response_pairs.jsonl"),
    currentMicroSegmentsFile: path.join(currentDir, "micro_segments.jsonl"),
    runTopicSegmentsFile: path.join(runDir, "topic_segments.jsonl"),
    runPromptResponsePairsFile: path.join(runDir, "prompt_response_pairs.jsonl"),
    runMicroSegmentsFile: path.join(runDir, "micro_segments.jsonl"),
    runPrivateReviewFile: path.join(runDir, "private_review_topic_segments.jsonl"),
    manifestFile: path.join(manifestsDir, runId + ".json")
  };
}
