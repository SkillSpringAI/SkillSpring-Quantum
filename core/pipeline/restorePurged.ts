import path from "node:path";
import { ensureDir, fileExists, moveFile } from "../utils/fs.js";

async function main(): Promise<void> {
  const sourceFile = process.argv[2];
  const outputRoot = process.argv[3] || "organized_output";

  if (!sourceFile) {
    console.error("Usage: npm run purge:restore -- <path-to-purged-md> [output-root]");
    process.exit(1);
  }

  const exists = await fileExists(sourceFile);
  if (!exists) {
    console.error("Purged file not found:", sourceFile);
    process.exit(1);
  }

  const fileName = path.basename(sourceFile);
  const restoreDir = path.join(outputRoot, "restore_queue");

  await ensureDir(restoreDir);

  const destination = path.join(restoreDir, fileName);
  await moveFile(sourceFile, destination);

  console.log("Purged file moved to restore queue:");
  console.log({
    sourceFile,
    destination
  });
}

main().catch((error) => {
  console.error("Restore helper failed:", error);
  process.exit(1);
});
