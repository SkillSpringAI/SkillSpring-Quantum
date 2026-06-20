import path from "node:path";
import { promises as fs } from "node:fs";
import { fileExists } from "../utils/fs.js";
import { resolveOutputRoot } from "../utils/paths.js";

interface DatasetRunSummary {
  run_id: string;
  dataset_version: string;
  source_context?: {
    pipeline_run_id: string;
    source_input_path?: string;
    detected_kind?: string;
    detected_label?: string;
    support_tier?: string;
    vendor_sources: string[];
    conversation_count?: number;
    message_count?: number;
    attachment_count?: number;
    package_companion_files?: number;
    package_companion_examples?: string[];
    topic_hints: string[];
  };
  redaction_summary?: {
    affected_segments: number;
    total_redactions: number;
    redaction_types: Record<string, number>;
  };
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
  runs: DatasetRunSummary[];
}

async function main(): Promise<void> {
  const outputRoot = resolveOutputRoot(process.argv[2]);
  const limit = Number(process.argv[3] || 8);
  const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : 8;
  const datasetsRoot = path.join(outputRoot, "datasets");
  const manifestPath = path.join(outputRoot, "db", "manifests", "latest-dataset-run.json");
  const manifestsDir = path.join(datasetsRoot, "manifests");

  let latest: DatasetRunSummary | null = null;
  const runs: DatasetRunSummary[] = [];

  if (await fileExists(manifestPath)) {
    latest = JSON.parse(await fs.readFile(manifestPath, "utf-8")) as DatasetRunSummary;
  }

  if (await fileExists(manifestsDir)) {
    const entries = await fs.readdir(manifestsDir, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile() && /^run-.*\.json$/i.test(entry.name))
      .map((entry) => path.join(manifestsDir, entry.name))
      .sort()
      .reverse()
      .slice(0, safeLimit);

    for (const filePath of files) {
      runs.push(JSON.parse(await fs.readFile(filePath, "utf-8")) as DatasetRunSummary);
    }
  }

  if (!latest) {
    latest = runs[0] ?? null;
  }

  const result: DatasetRunResult = {
    outputRoot,
    datasetsRoot,
    manifestPath,
    latest,
    runs
  };

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error("Read latest dataset run failed:", error);
  process.exit(1);
});
