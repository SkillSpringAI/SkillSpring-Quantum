import path from "node:path";
import { promises as fs } from "node:fs";
import { fileExists } from "../utils/fs.js";
import { resolveOutputRoot } from "../utils/paths.js";

type DatasetPreviewKind =
  | "topic_segments"
  | "prompt_response_pairs"
  | "micro_segments"
  | "private_review";

interface DatasetRunSummary {
  run_id: string;
  dataset_version: string;
}

interface DatasetPreviewResult {
  outputRoot: string;
  runId: string;
  kind: DatasetPreviewKind;
  scope: "historical_run" | "latest_current_bundle";
  sourcePath: string;
  limit: number;
  offset: number;
  totalRecords: number;
  hasMore: boolean;
  records: unknown[];
}

function parseArgs(argv: string[]): {
  outputRoot: string;
  runId?: string;
  kind?: DatasetPreviewKind;
  limit: number;
  offset: number;
} {
  const outputRoot = resolveOutputRoot(argv[2]);
  const runId = argv[3];
  const kind = argv[4] as DatasetPreviewKind | undefined;
  const limit = Number(argv[5] || 25);
  const offset = Number(argv[6] || 0);

  return {
    outputRoot,
    runId,
    kind,
    limit: Number.isFinite(limit) && limit > 0 ? limit : 25,
    offset: Number.isFinite(offset) && offset >= 0 ? offset : 0
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);

  if (!args.runId || !args.kind) {
    console.error("Usage: npm run datasets:preview -- <outputRoot> <runId> <kind> [limit] [offset]");
    process.exit(1);
  }

  const manifestPath = path.join(args.outputRoot, "datasets", "manifests", args.runId + ".json");
  let manifest: DatasetRunSummary | null = null;

  if (await fileExists(manifestPath)) {
    manifest = JSON.parse(await fs.readFile(manifestPath, "utf-8")) as DatasetRunSummary;
  }

  const latestManifestPath = path.join(args.outputRoot, "db", "manifests", "latest-dataset-run.json");
  const latest = await fileExists(latestManifestPath)
    ? JSON.parse(await fs.readFile(latestManifestPath, "utf-8")) as DatasetRunSummary
    : null;

  const runRoot = path.join(args.outputRoot, "datasets", "runs", args.runId);
  const historicalPathByKind: Record<DatasetPreviewKind, string> = {
    topic_segments: path.join(runRoot, "topic_segments.jsonl"),
    prompt_response_pairs: path.join(runRoot, "prompt_response_pairs.jsonl"),
    micro_segments: path.join(runRoot, "micro_segments.jsonl"),
    private_review: path.join(runRoot, "private_review_topic_segments.jsonl")
  };
  const currentPathByKind: Record<DatasetPreviewKind, string> = {
    topic_segments: path.join(args.outputRoot, "datasets", "current", "topic_segments.jsonl"),
    prompt_response_pairs: path.join(args.outputRoot, "datasets", "current", "prompt_response_pairs.jsonl"),
    micro_segments: path.join(args.outputRoot, "datasets", "current", "micro_segments.jsonl"),
    private_review: path.join(args.outputRoot, "db", "tier3_private_review", "topic_segments.jsonl")
  };

  const preferredHistoricalPath = historicalPathByKind[args.kind];
  const canUseHistorical = await fileExists(preferredHistoricalPath);
  const shouldUseHistorical = canUseHistorical && manifest?.run_id === args.runId;
  const sourcePath = shouldUseHistorical
    ? preferredHistoricalPath
    : currentPathByKind[args.kind];

  let raw = "";
  try {
    raw = await fs.readFile(sourcePath, "utf-8");
  } catch {
    raw = "";
  }

  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const records = lines
    .slice(args.offset, args.offset + args.limit)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return { parse_error: true, raw: line };
      }
    });

  const result: DatasetPreviewResult = {
    outputRoot: args.outputRoot,
    runId: args.runId,
    kind: args.kind,
    scope: shouldUseHistorical ? "historical_run" : "latest_current_bundle",
    sourcePath,
    limit: args.limit,
    offset: args.offset,
    totalRecords: lines.length,
    hasMore: args.offset + records.length < lines.length,
    records
  };

  if (latest?.run_id && !shouldUseHistorical && latest.run_id === args.runId) {
    result.scope = "latest_current_bundle";
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error("Read dataset preview failed:", error);
  process.exit(1);
});
