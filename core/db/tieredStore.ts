import path from "node:path";
import { appendTextFile, ensureDir, writeTextFile } from "../utils/fs.js";
import {
  addFingerprint,
  fingerprintRecord,
  hasFingerprint,
  loadDbFingerprintIndex,
  saveDbFingerprintIndex
} from "./fingerprintStore.js";

export type TierName =
  | "tier0_raw"
  | "tier1_processed"
  | "tier2_curated"
  | "tier3_private_review";

export interface TieredDbWriteResult {
  tier: TierName;
  filePath: string;
  recordsWritten: number;
  recordsSkipped: number;
}

async function appendJsonl(filePath: string, lines: string[]): Promise<void> {
  if (lines.length === 0) return;

  await appendTextFile(filePath, lines.join("\n") + "\n");
}

export async function writeTierRecords(
  dbRoot: string,
  tier: TierName,
  collection: string,
  records: unknown[]
): Promise<TieredDbWriteResult> {
  const filePath = path.join(dbRoot, tier, collection + ".jsonl");
  const fingerprintIndex = await loadDbFingerprintIndex(dbRoot);

  const linesToWrite: string[] = [];
  let skipped = 0;
  let written = 0;

  for (const record of records) {
    const fingerprint = fingerprintRecord(record);

    if (hasFingerprint(fingerprintIndex, fingerprint, tier, collection)) {
      skipped += 1;
      continue;
    }

    addFingerprint(fingerprintIndex, fingerprint, tier, collection);
    linesToWrite.push(JSON.stringify(record));
    written += 1;
  }

  await appendJsonl(filePath, linesToWrite);
  await saveDbFingerprintIndex(dbRoot, fingerprintIndex);

  return {
    tier,
    filePath,
    recordsWritten: written,
    recordsSkipped: skipped
  };
}

export async function writeDbManifest(
  dbRoot: string,
  manifestName: string,
  manifest: unknown
): Promise<string> {
  const filePath = path.join(dbRoot, "manifests", manifestName);
  await ensureDir(path.dirname(filePath));
  await writeTextFile(filePath, JSON.stringify(manifest, null, 2));
  return filePath;
}
