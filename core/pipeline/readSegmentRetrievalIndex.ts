import path from "node:path";
import { fileExists, readJsonFile } from "../utils/fs.js";
import { resolveOutputRoot } from "../utils/paths.js";
import type { SegmentRetrievalIndexManifest } from "./segmentRetrievalIndex.js";

interface SegmentRetrievalIndexResult {
  outputRoot: string;
  retrievalRoot: string;
  latestFile: string;
  latest: SegmentRetrievalIndexManifest | null;
}

async function main(): Promise<void> {
  const outputRoot = resolveOutputRoot(process.argv[2]);
  const retrievalRoot = path.join(outputRoot, "retrieval");
  const latestFile = path.join(retrievalRoot, "latest-segment-index.json");

  const result: SegmentRetrievalIndexResult = {
    outputRoot,
    retrievalRoot,
    latestFile,
    latest: null
  };

  if (await fileExists(latestFile)) {
    result.latest = await readJsonFile<SegmentRetrievalIndexManifest>(latestFile);
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error("Read segment retrieval index failed:", error);
  process.exit(1);
});
