import path from "node:path";
import { ensureDir, writeTextFile } from "../utils/fs.js";

export interface RunManifest {
  run_started_at: string;
  run_completed_at?: string;
  source_file_count: number;
  conversations_found: number;
  segments_created: number;
  markdown_primary_written: number;
  markdown_backup_written: number;
  markdown_duplicate_skipped: number;
  dataset_topic_segments: number;
  dataset_prompt_response_pairs: number;
  included_topics?: string[];
  excluded_topics?: string[];
}

export function createRunManifest(): RunManifest {
  return {
    run_started_at: new Date().toISOString(),
    source_file_count: 0,
    conversations_found: 0,
    segments_created: 0,
    markdown_primary_written: 0,
    markdown_backup_written: 0,
    markdown_duplicate_skipped: 0,
    dataset_topic_segments: 0,
    dataset_prompt_response_pairs: 0
  };
}

export async function saveRunManifest(rootOutputDir: string, manifest: RunManifest): Promise<void> {
  manifest.run_completed_at = new Date().toISOString();

  const runsDir = path.join(rootOutputDir, "runs");
  await ensureDir(runsDir);

  const stamp = manifest.run_started_at.replace(/[:.]/g, "-");
  const filePath = path.join(runsDir, "run_" + stamp + ".json");

  await writeTextFile(filePath, JSON.stringify(manifest, null, 2));
}
