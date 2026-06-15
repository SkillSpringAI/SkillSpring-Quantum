import path from "node:path";
import { promises as fs } from "node:fs";
import { dbRoot, resolveOutputRoot } from "../utils/paths.js";

interface ReadResult {
  outputRoot: string;
  tier: string;
  collection: string;
  limit: number;
  records: unknown[];
}

function parseArgs(argv: string[]): {
  outputRoot: string;
  tier?: string;
  collection?: string;
  limit: number;
} {
  const outputRoot = resolveOutputRoot(argv[2]);
  const tier = argv[3];
  const collection = argv[4];
  const limit = Number(argv[5] || 25);

  return {
    outputRoot,
    tier,
    collection,
    limit: Number.isFinite(limit) && limit > 0 ? limit : 25
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);

  if (!args.tier || !args.collection) {
    console.error("Usage: npm run db:read -- <outputRoot> <tier> <collection> [limit]");
    process.exit(1);
  }

  const filePath = path.join(dbRoot(args.outputRoot), args.tier, args.collection + ".jsonl");

  let raw = "";
  try {
    raw = await fs.readFile(filePath, "utf-8");
  } catch {
    console.error("Collection file not found:", filePath);
    process.exit(1);
  }

  const records = raw
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .slice(0, args.limit)
    .map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return { parse_error: true, raw: line };
      }
    });

  const result: ReadResult = {
    outputRoot: args.outputRoot,
    tier: args.tier,
    collection: args.collection,
    limit: args.limit,
    records
  };

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error("Read collection failed:", error);
  process.exit(1);
});
