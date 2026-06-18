import { readSavedViews } from "./savedViews.js";

async function main(): Promise<void> {
  const outputRoot = process.argv[2] || "organized_output";
  const result = await readSavedViews(outputRoot);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error("Read saved retrieval views failed:", error);
  process.exit(1);
});
