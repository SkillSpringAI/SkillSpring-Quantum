import path from "node:path";
import { fileExists, readJsonFile } from "../utils/fs.js";
import { resolveOutputRoot } from "../utils/paths.js";
import type { ImportRetrievalIndexManifest } from "./importRetrievalIndex.js";

interface ImportRetrievalIndexResult {
  outputRoot: string;
  importsRoot: string;
  latestFile: string;
  latest: ImportRetrievalIndexManifest | null;
}

async function main(): Promise<void> {
  const outputRoot = resolveOutputRoot(process.argv[2]);
  const importsRoot = path.join(outputRoot, "imports");
  const latestFile = path.join(importsRoot, "latest-retrieval-index.json");

  const result: ImportRetrievalIndexResult = {
    outputRoot,
    importsRoot,
    latestFile,
    latest: null
  };

  if (await fileExists(latestFile)) {
    result.latest = await readJsonFile<ImportRetrievalIndexManifest>(latestFile);
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error("Read import retrieval index failed:", error);
  process.exit(1);
});
