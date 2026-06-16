import path from "node:path";
import { promises as fs } from "node:fs";
import { fileExists } from "../utils/fs.js";
import { resolveOutputRoot } from "../utils/paths.js";

interface DatasetRunSummary {
  run_id: string;
  dataset_version: string;
  topic_segments: number;
  prompt_response_pairs: number;
  micro_segments: number;
  private_review_segments: number;
  filtered_out_segments: number;
  topics: Record<string, number>;
  tiers: Record<string, number>;
  db_write_stats: Record<string, number>;
}

interface DatasetRunResult {
  outputRoot: string;
  datasetsRoot: string;
  manifestPath: string;
  latest: DatasetRunSummary | null;
}

async function main(): Promise<void> {
  const outputRoot = resolveOutputRoot(process.argv[2]);
  const datasetsRoot = path.join(outputRoot, "datasets");
  const manifestPath = path.join(outputRoot, "db", "manifests", "latest-dataset-run.json");

  let latest: DatasetRunSummary | null = null;

  if (await fileExists(manifestPath)) {
    latest = JSON.parse(await fs.readFile(manifestPath, "utf-8")) as DatasetRunSummary;
  }

  const result: DatasetRunResult = {
    outputRoot,
    datasetsRoot,
    manifestPath,
    latest
  };

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error("Read latest dataset run failed:", error);
  process.exit(1);
});
