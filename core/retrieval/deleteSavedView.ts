import { deleteRetrievalView } from "./savedViews.js";

async function main(): Promise<void> {
  const outputRoot = process.argv[2] || "organized_output";
  const id = process.argv[3] || "";
  const result = await deleteRetrievalView({ outputRoot, id });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error("Delete retrieval view failed:", error);
  process.exit(1);
});
