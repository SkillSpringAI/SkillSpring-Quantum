import {
  saveRetrievalView,
  type RetrievalSavedRecordSelection,
  type RetrievalSavedSegmentSelection,
  type RetrievalSavedViewFilters
} from "./savedViews.js";

async function main(): Promise<void> {
  const outputRoot = process.argv[2] || "organized_output";
  const name = process.argv[3] || "";
  const rawFilters = process.argv[4] || "{}";
  const rawSelectedRecord = process.argv[5] || "null";
  const rawSelectedSegment = process.argv[6] || "null";

  const filters = JSON.parse(rawFilters) as RetrievalSavedViewFilters;
  const selectedRecord = JSON.parse(rawSelectedRecord) as RetrievalSavedRecordSelection | null;
  const selectedSegment = JSON.parse(rawSelectedSegment) as RetrievalSavedSegmentSelection | null;
  const result = await saveRetrievalView({
    outputRoot,
    name,
    filters,
    selectedRecord: selectedRecord ?? undefined,
    selectedSegment: selectedSegment ?? undefined
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error("Save retrieval view failed:", error);
  process.exit(1);
});
