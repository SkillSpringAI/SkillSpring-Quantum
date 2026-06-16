import { inspectImportSource } from "./sourceIntake.js";

async function main(): Promise<void> {
  const inputPath = process.argv[2];

  if (!inputPath) {
    console.error("Usage: tsx core/imports/inspectImportSource.ts <inputPath>");
    process.exit(1);
  }

  const result = await inspectImportSource(inputPath);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error("Import source inspection failed:", error);
  process.exit(1);
});
