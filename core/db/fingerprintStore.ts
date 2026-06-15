import path from "node:path";
import { ensureDir, fileExists, readJsonFile, writeTextFile } from "../utils/fs.js";
import { sha256 } from "../utils/hash.js";

export interface DbFingerprintRecord {
  fingerprint: string;
  tier: string;
  collection: string;
  first_seen_at: string;
}

export interface DbFingerprintIndex {
  records: DbFingerprintRecord[];
}

function emptyIndex(): DbFingerprintIndex {
  return { records: [] };
}

export async function loadDbFingerprintIndex(dbRoot: string): Promise<DbFingerprintIndex> {
  const filePath = path.join(dbRoot, "indexes", "fingerprints.json");

  if (!(await fileExists(filePath))) {
    return emptyIndex();
  }

  try {
    const loaded = await readJsonFile<DbFingerprintIndex>(filePath);
    return {
      records: loaded.records ?? []
    };
  } catch {
    return emptyIndex();
  }
}

export async function saveDbFingerprintIndex(dbRoot: string, index: DbFingerprintIndex): Promise<void> {
  const filePath = path.join(dbRoot, "indexes", "fingerprints.json");
  await ensureDir(path.dirname(filePath));
  await writeTextFile(filePath, JSON.stringify(index, null, 2));
}

export function fingerprintRecord(record: unknown): string {
  return sha256(JSON.stringify(record));
}

export function hasFingerprint(
  index: DbFingerprintIndex,
  fingerprint: string,
  tier: string,
  collection: string
): boolean {
  return index.records.some(
    r =>
      r.fingerprint === fingerprint &&
      r.tier === tier &&
      r.collection === collection
  );
}

export function addFingerprint(
  index: DbFingerprintIndex,
  fingerprint: string,
  tier: string,
  collection: string
): void {
  if (hasFingerprint(index, fingerprint, tier, collection)) return;

  index.records.push({
    fingerprint,
    tier,
    collection,
    first_seen_at: new Date().toISOString()
  });
}
