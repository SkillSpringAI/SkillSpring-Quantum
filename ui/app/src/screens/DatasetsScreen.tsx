import { useEffect, useState } from "react";
import { loadLatestDatasetRun } from "../services/datasetRunBridge";
import { revealDesktopPath } from "../services/pathBridge";
import type {
  DatasetRunResult,
  DatasetSourceContext,
  DatasetRedactionSummary
} from "../types/datasetRun";
import { useNavigation } from "../state/navigationContext";

function buildDatasetArtifactPaths(outputRoot: string) {
  return {
    dbRoot: outputRoot + "\\db",
    manifestsRoot: outputRoot + "\\datasets\\manifests",
    currentTopicSegments: outputRoot + "\\datasets\\current\\topic_segments.current.jsonl",
    currentPromptResponse: outputRoot + "\\datasets\\current\\prompt_response_pairs.current.jsonl",
    currentMicroSegments: outputRoot + "\\datasets\\current\\micro_segments.current.jsonl",
    currentPrivateReview: outputRoot + "\\db\\tier3_private_review\\topic_segments_private_review.jsonl",
    diagnostics: outputRoot + "\\diagnostics\\latest-run.json"
  };
}

export default function DatasetsScreen() {
  const { setActiveScreen, openRetrievalInvestigation } = useNavigation();
  const [datasetRun, setDatasetRun] = useState<DatasetRunResult | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  useEffect(() => {
    loadLatestDatasetRun("organized_output", 8).then((result) => {
      setDatasetRun(result);
      setSelectedRunId(result.latest?.run_id ?? result.runs[0]?.run_id ?? null);
    });
  }, []);

  const selectedRun =
    datasetRun?.runs.find((run) => run.run_id === selectedRunId) ??
    datasetRun?.latest ??
    null;
  const artifactPaths = buildDatasetArtifactPaths(datasetRun?.outputRoot ?? "organized_output");
  const selectedManifestPath = selectedRun
    ? artifactPaths.manifestsRoot + "\\" + selectedRun.run_id + ".json"
    : datasetRun?.manifestPath ?? artifactPaths.manifestsRoot + "\\latest-dataset-run.json";
  const selectedSourceContext = selectedRun?.source_context;
  const selectedSourceSummary = summarizeDatasetSourceContext(selectedSourceContext);
  const selectedSourceBadges = summarizeDatasetSourceBadges(selectedSourceContext);
  const selectedSourceNeedsAttention = selectedSourceContext?.support_tier === "mvp_compatibility_fallback";
  const selectedSourceTopics = selectedSourceContext?.topic_hints.slice(0, 4) ?? [];
  const selectedRedactionSummary = selectedRun?.redaction_summary;
  const selectedRedactionExplanation = summarizeRedactionExplanation(
    selectedRedactionSummary,
    selectedRun?.private_review_segments ?? 0
  );

  return (
    <section className="screen-grid">
      <div className="panel">
        <h2>Datasets</h2>
        {!selectedRun ? (
          <>
            <p className="muted">
              No dataset files are available yet. Start in Imports, run a conversation import, then come back here to review structured output.
            </p>
            <div className="action-bar">
              <button className="primary-btn" type="button" onClick={() => setActiveScreen("imports")}>
                Go To Imports
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="muted">
              These files are the structured dataset outputs generated from imported conversation runs in this output folder.
            </p>
            {datasetRun && datasetRun.runs.length > 1 ? (
              <div className="detail-box">
                <strong>Recent Dataset Runs</strong>
                <div className="action-bar">
                  {datasetRun.runs.slice(0, 6).map((run) => (
                    <button
                      key={run.run_id}
                      className={selectedRun.run_id === run.run_id ? "primary-btn" : "secondary-btn"}
                      type="button"
                      onClick={() => setSelectedRunId(run.run_id)}
                    >
                      {formatDatasetRunLabel(run)}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {selectedSourceContext ? (
              <div className="detail-box">
                <strong>Selected Import Context</strong>
                <p className="muted">
                  Imported from: {selectedSourceContext.source_input_path ?? "Source path unavailable"}
                </p>
                <p className="muted">
                  Dataset source: {selectedSourceSummary}
                </p>
                <p className="muted">
                  Dataset run: {selectedRun.run_id}
                </p>
                {selectedSourceContext.pipeline_run_id ? (
                  <p className="muted">
                    Pipeline run: {selectedSourceContext.pipeline_run_id}
                  </p>
                ) : null}
                {selectedSourceTopics.length > 0 ? (
                  <p className="muted">
                    Topic hints: {selectedSourceTopics.join(", ")}
                  </p>
                ) : null}
                {selectedSourceBadges.length > 0 ? (
                  <p className="muted">
                    {selectedSourceBadges.join(" | ")}
                  </p>
                ) : null}
                {shouldRecommendGovernance(selectedRun) ? (
                  <div className="context-tip">
                    <strong>Power-user option</strong>
                    <p className="muted">
                      If you want to tune privacy handling or review thresholds, open <strong>More Tools</strong> in the sidebar, then choose <strong>Governance</strong>.
                    </p>
                  </div>
                ) : null}
                <div className="action-bar">
                  <button className="secondary-btn" type="button" onClick={() => setActiveScreen("imports")}>
                    Review Import History
                  </button>
                  {selectedSourceContext.vendor_sources.length > 0 || selectedSourceTopics.length > 0 ? (
                    <button
                      className="secondary-btn"
                      type="button"
                      onClick={() =>
                        openRetrievalInvestigation({
                          filters: {
                            text: "",
                            vendor: selectedSourceContext.vendor_sources[0] ?? "",
                            topic: selectedSourceTopics[0] ?? "",
                            status: "all",
                            from: "",
                            to: ""
                          },
                          suggestedName:
                            selectedSourceTopics[0] ||
                            selectedSourceContext.vendor_sources[0] ||
                            "Selected dataset import"
                        })
                      }
                    >
                      Find Imported Files
                    </button>
                  ) : null}
                  {selectedSourceNeedsAttention ? (
                    <button className="secondary-btn" type="button" onClick={() => revealDesktopPath(artifactPaths.diagnostics)}>
                      Open Latest Diagnostics
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
            <div className="stats-grid two-col">
              <div className="stat-card">
                <span className="label">Topic Segments</span>
                <strong>{selectedRun.topic_segments}</strong>
                <p className="muted">Longer grouped conversation chunks organized by inferred topic.</p>
              </div>
              <div className="stat-card">
                <span className="label">Prompt/Response</span>
                <strong>{selectedRun.prompt_response_pairs}</strong>
                <p className="muted">User prompt and assistant reply pairs that are easiest to review quickly.</p>
              </div>
              <div className="stat-card">
                <span className="label">Micro Segments</span>
                <strong>{selectedRun.micro_segments}</strong>
                <p className="muted">Small message windows for search, spot checks, and lightweight review.</p>
              </div>
              <div className="stat-card">
                <span className="label">Private Review</span>
                <strong>{selectedRun.private_review_segments}</strong>
                <p className="muted">Records that need extra care because signal or privacy rules were more sensitive.</p>
              </div>
            </div>
            <div className="action-bar">
              <button className="primary-btn" type="button" onClick={() => revealDesktopPath(datasetRun.datasetsRoot)}>
                Open Dataset Files
              </button>
              <button className="primary-btn" type="button" onClick={() => revealDesktopPath(selectedManifestPath)}>
                Open Selected Dataset Summary
              </button>
              <button className="secondary-btn" type="button" onClick={() => revealDesktopPath(artifactPaths.currentTopicSegments)}>
                Open Current Topic Segments
              </button>
              <button className="secondary-btn" type="button" onClick={() => revealDesktopPath(artifactPaths.currentPromptResponse)}>
                Open Current Prompt/Response
              </button>
              <button className="secondary-btn" type="button" onClick={() => revealDesktopPath(artifactPaths.currentMicroSegments)}>
                Open Current Micro Segments
              </button>
            </div>
          </>
        )}
      </div>

      <div className="panel">
        <h2>Dataset Notes</h2>
        {selectedRun ? (
          <>
            <p className="muted">Selected dataset build: {selectedRun.run_id}</p>
            <p className="muted">Format version: {selectedRun.dataset_version}</p>
            <p className="muted">Filtered out during cleanup: {selectedRun.filtered_out_segments}</p>
            <p className="muted">
              High-signal sections: {selectedRun.tiers.high_signal ?? 0} | Low-signal sections: {selectedRun.tiers.low_signal ?? 0}
            </p>
            <p className="muted">
              Private-review sections are separated so you can inspect them before treating them as normal reusable data.
            </p>
            <p className="muted">
              Privacy handling: {selectedRedactionExplanation}
            </p>
            {selectedSourceNeedsAttention ? (
              <p className="muted">
                This dataset came from a recovery-path import. Review diagnostics or import history before treating every record as equally complete.
              </p>
            ) : (
              <p className="muted">
                This dataset came from the latest completed import run and is ready for normal review.
              </p>
            )}
            <div className="action-bar">
              <button className="secondary-btn" type="button" onClick={() => revealDesktopPath(artifactPaths.currentPrivateReview)}>
                Open Private Review File
              </button>
              <button className="secondary-btn" type="button" onClick={() => revealDesktopPath(artifactPaths.diagnostics)}>
                Open Latest Diagnostics
              </button>
              <button className="secondary-btn" type="button" onClick={() => revealDesktopPath(artifactPaths.dbRoot)}>
                Open Private Review Folder
              </button>
            </div>
          </>
        ) : (
          <p className="muted">
            After your first dataset-producing import, this screen will summarize the latest structured output here.
          </p>
        )}
      </div>

      <div className="panel">
        <h2>How To Read This</h2>
        <ul className="list">
          <li>Start with Selected Import Context when you want to know where this dataset came from and whether it used a recovery path.</li>
          <li>Use Recent Dataset Runs when you want to compare the latest dataset with an earlier import in the same output folder.</li>
          <li>The selected dataset summary is per run, while the current dataset files reflect the latest accumulated current outputs.</li>
          <li>Privacy handling summarizes which common sensitive patterns were redacted before dataset records were written.</li>
          <li>Governance is available under More Tools for power users, but it should not block normal importing or dataset review.</li>
          <li>Open topic segments when you want the clearest topic-organized view of imported conversations.</li>
          <li>Open prompt/response pairs when you want faster review of direct question-and-answer examples.</li>
          <li>Open micro segments when you want smaller chunks for search or lightweight review.</li>
          <li>Check private review and diagnostics when a run needs extra trust or privacy inspection.</li>
        </ul>
      </div>
    </section>
  );
}

function summarizeDatasetSourceContext(sourceContext: DatasetSourceContext | undefined): string {
  if (!sourceContext) {
    return "No import context available yet.";
  }

  const parts: string[] = [];
  if (sourceContext.detected_label) {
    parts.push(sourceContext.detected_label);
  }
  if (sourceContext.support_tier === "mvp_first_class") {
    parts.push("ready-now path");
  } else if (sourceContext.support_tier === "mvp_compatibility_fallback") {
    parts.push("recovery path");
  }
  if (typeof sourceContext.conversation_count === "number") {
    parts.push(sourceContext.conversation_count + " conversation(s)");
  }
  if (typeof sourceContext.message_count === "number") {
    parts.push(sourceContext.message_count + " message(s)");
  }
  return parts.join(" | ");
}

function summarizeDatasetSourceBadges(sourceContext: DatasetSourceContext | undefined): string[] {
  if (!sourceContext) {
    return [];
  }

  const badges: string[] = [];
  if (sourceContext.support_tier === "mvp_first_class") {
    badges.push("ready-now import");
  }
  if (sourceContext.support_tier === "mvp_compatibility_fallback") {
    badges.push("recovery-path import");
  }
  if (sourceContext.vendor_sources.length > 0) {
    badges.push(sourceContext.vendor_sources.join(", "));
  }
  if ((sourceContext.attachment_count ?? 0) > 0) {
    badges.push((sourceContext.attachment_count ?? 0) + " attachment reference(s)");
  }
  return badges;
}

function formatDatasetRunLabel(run: DatasetRunResult["runs"][number]): string {
  const stamp = run.run_id.replace(/^run-/, "").replace(/-/g, ":");
  const source = run.source_context?.vendor_sources[0] ?? run.source_context?.detected_label ?? "dataset";
  return source + " | " + stamp.slice(0, 16);
}

function shouldRecommendGovernance(run: DatasetRunResult["runs"][number] | null): boolean {
  if (!run) {
    return false;
  }

  return (
    (run.redaction_summary?.total_redactions ?? 0) > 0 ||
    run.private_review_segments > 0 ||
    run.source_context?.support_tier === "mvp_compatibility_fallback"
  );
}

function summarizeRedactionExplanation(
  redactionSummary: DatasetRedactionSummary | undefined,
  privateReviewSegments: number
): string {
  if (!redactionSummary || redactionSummary.total_redactions === 0) {
    if (privateReviewSegments > 0) {
      return privateReviewSegments + " segment(s) were still sent to private review even though no direct email, phone, URL, or address redactions were counted in this summary.";
    }

    return "No common email, phone, URL, or address redactions were counted in this dataset run.";
  }

  const typeLabels = Object.entries(redactionSummary.redaction_types)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([flag, count]) => formatRedactionFlagLabel(flag, count));

  const parts = [
    redactionSummary.total_redactions + " redaction(s) across " + redactionSummary.affected_segments + " segment(s)"
  ];

  if (typeLabels.length > 0) {
    parts.push(typeLabels.join(", "));
  }

  if (privateReviewSegments > 0) {
    parts.push(privateReviewSegments + " segment(s) also landed in private review for extra caution");
  }

  return parts.join(" | ") + ".";
}

function formatRedactionFlagLabel(flag: string, count: number): string {
  switch (flag) {
    case "email":
      return count + " email";
    case "phone":
      return count + " phone";
    case "url":
      return count + " URL";
    case "address":
      return count + " address";
    default:
      return count + " " + flag;
  }
}
