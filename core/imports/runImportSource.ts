import { runImportSource } from "./sourceIntake.js";

async function main(): Promise<void> {
  const inputPath = process.argv[2];
  const outputRoot = process.argv[3] || "organized_output";

  if (!inputPath) {
    console.error("Usage: tsx core/imports/runImportSource.ts <inputPath> [outputRoot]");
    process.exit(1);
  }

  const result = await runImportSource(inputPath, outputRoot);
  console.log(JSON.stringify(result, null, 2));

  if (result.filesFailed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Import source run failed:", error);
  process.exit(1);
});
