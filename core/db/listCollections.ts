import path from "node:path";
import { promises as fs } from "node:fs";
import { dbRoot, resolveOutputRoot } from "../utils/paths.js";

interface CollectionEntry {
  tier: string;
  name: string;
  file: string;
}

async function safeListJsonl(dirPath: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries
      .filter(e => e.isFile() && e.name.toLowerCase().endsWith(".jsonl"))
      .map(e => e.name);
  } catch {
    return [];
  }
}

async function main(): Promise<void> {
  const outputRoot = resolveOutputRoot(process.argv[2]);
  const root = dbRoot(outputRoot);

  const tiers = [
    "tier0_raw",
    "tier1_processed",
    "tier2_curated",
    "tier3_private_review"
  ];

  const collections: CollectionEntry[] = [];

  for (const tier of tiers) {
    const dir = path.join(root, tier);
    const files = await safeListJsonl(dir);

    for (const file of files) {
      collections.push({
        tier,
        name: file.replace(/\.jsonl$/i, ""),
        file
      });
    }
  }

  console.log(JSON.stringify({
    outputRoot,
    dbRoot: root,
    collections
  }, null, 2));
}

main().catch((error) => {
  console.error("List collections failed:", error);
  process.exit(1);
});
