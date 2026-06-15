import path from "node:path";

export interface DatasetPaths {
  runId: string;
  manifestsDir: string;
  topicSegmentsFile: string;
  promptResponsePairsFile: string;
  microSegmentsFile: string;
  currentTopicSegmentsFile: string;
  currentPromptResponsePairsFile: string;
  currentMicroSegmentsFile: string;
  manifestFile: string;
}

function safeTimestamp(date: Date): string {
  return date.toISOString().replace(/[:.]/g, "-");
}

export function buildDatasetPaths(rootOutputDir: string, version = "v1"): DatasetPaths {
  const runId = "run-" + safeTimestamp(new Date());

  const datasetsRoot = path.join(rootOutputDir, "datasets");
  const manifestsDir = path.join(datasetsRoot, "manifests");

  const topicSegmentsDir = path.join(datasetsRoot, "topic_segments", version);
  const promptResponseDir = path.join(datasetsRoot, "prompt_response_pairs", version);
  const microSegmentsDir = path.join(datasetsRoot, "micro_segments", version);

  const currentDir = path.join(datasetsRoot, "current");

  return {
    runId,
    manifestsDir,
    topicSegmentsFile: path.join(topicSegmentsDir, "data.jsonl"),
    promptResponsePairsFile: path.join(promptResponseDir, "data.jsonl"),
    microSegmentsFile: path.join(microSegmentsDir, "data.jsonl"),
    currentTopicSegmentsFile: path.join(currentDir, "topic_segments.jsonl"),
    currentPromptResponsePairsFile: path.join(currentDir, "prompt_response_pairs.jsonl"),
    currentMicroSegmentsFile: path.join(currentDir, "micro_segments.jsonl"),
    manifestFile: path.join(manifestsDir, runId + ".json")
  };
}
