import type { DatasetRunResult } from "../types/datasetRun";
import { readLatestDatasetRun } from "./desktopBridge";

export async function loadLatestDatasetRun(
  outputRoot = "organized_output",
  limit = 8
): Promise<DatasetRunResult> {
  const response = await readLatestDatasetRun({ outputRoot, limit });

  if (!response.ok) {
    return {
      outputRoot,
      datasetsRoot: outputRoot + "/datasets",
      manifestPath: outputRoot + "/db/manifests/latest-dataset-run.json",
      latest: null,
      runs: []
    };
  }

  const result = response.result as Partial<DatasetRunResult>;
  const runs = Array.isArray(result.runs)
    ? result.runs.map((run) => ({
        ...run,
        source_context: run.source_context
          ? {
              ...run.source_context,
              vendor_sources: Array.isArray(run.source_context.vendor_sources) ? run.source_context.vendor_sources : [],
              package_companion_examples: Array.isArray(run.source_context.package_companion_examples)
                ? run.source_context.package_companion_examples
                : [],
              topic_hints: Array.isArray(run.source_context.topic_hints) ? run.source_context.topic_hints : []
            }
          : undefined,
        redaction_summary: run.redaction_summary
          ? {
              ...run.redaction_summary,
              redaction_types:
                run.redaction_summary.redaction_types && typeof run.redaction_summary.redaction_types === "object"
                  ? run.redaction_summary.redaction_types
                  : {}
            }
          : undefined,
        topics: run.topics && typeof run.topics === "object" ? run.topics : {},
        tiers: run.tiers && typeof run.tiers === "object" ? run.tiers : {},
        db_write_stats: run.db_write_stats && typeof run.db_write_stats === "object" ? run.db_write_stats : {}
      }))
    : [];

  return {
    outputRoot: result.outputRoot ?? outputRoot,
    datasetsRoot: result.datasetsRoot ?? outputRoot + "/datasets",
    manifestPath: result.manifestPath ?? outputRoot + "/db/manifests/latest-dataset-run.json",
    latest: result.latest
      ? {
          ...result.latest,
          source_context: result.latest.source_context
            ? {
                ...result.latest.source_context,
                vendor_sources: Array.isArray(result.latest.source_context.vendor_sources)
                  ? result.latest.source_context.vendor_sources
                  : [],
                package_companion_examples: Array.isArray(result.latest.source_context.package_companion_examples)
                  ? result.latest.source_context.package_companion_examples
                  : [],
                topic_hints: Array.isArray(result.latest.source_context.topic_hints)
                  ? result.latest.source_context.topic_hints
                  : []
              }
            : undefined,
          redaction_summary: result.latest.redaction_summary
            ? {
                ...result.latest.redaction_summary,
                redaction_types:
                  result.latest.redaction_summary.redaction_types &&
                  typeof result.latest.redaction_summary.redaction_types === "object"
                    ? result.latest.redaction_summary.redaction_types
                    : {}
              }
            : undefined,
          topics: result.latest.topics && typeof result.latest.topics === "object" ? result.latest.topics : {},
          tiers: result.latest.tiers && typeof result.latest.tiers === "object" ? result.latest.tiers : {},
          db_write_stats:
            result.latest.db_write_stats && typeof result.latest.db_write_stats === "object"
              ? result.latest.db_write_stats
              : {}
        }
      : runs[0] ?? null,
    runs
  };
}
