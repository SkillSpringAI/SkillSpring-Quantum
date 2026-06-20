import { useEffect, useState } from "react";
import { loadLatestDatasetRun } from "../services/datasetRunBridge";
import { revealDesktopPath } from "../services/pathBridge";
import type { DatasetRunResult, DatasetSourceContext } from "../types/datasetRun";
import { useNavigation } from "../state/navigationContext";

function buildDatasetArtifactPaths(outputRoot: string) {
  return {
    dbRoot: outputRoot + "\\db",
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

  useEffect(() => {
    loadLatestDatasetRun("organized_output").then(setDatasetRun);
  }, []);

  const artifactPaths = buildDatasetArtifactPaths(datasetRun?.outputRoot ?? "organized_output");
  const latestSourceContext = datasetRun?.latest?.source_context;
  const latestSourceSummary = summarizeDatasetSourceContext(latestSourceContext);
  const latestSourceBadges = summarizeDatasetSourceBadges(latestSourceContext);
  const latestSourceNeedsAttention = latestSourceContext?.support_tier === "mvp_compatibility_fallback";
  const latestSourceTopics = latestSourceContext?.topic_hints.slice(0, 4) ?? [];

  return (
    <section className="screen-grid">
      <div className="panel">
        <h2>Datasets</h2>
        {!datasetRun?.latest ? (
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
              These files are the structured dataset outputs generated from the same imported conversation run.
            </p>
            {latestSourceContext ? (
              <div className="detail-box">
                <strong>Latest Import Context</strong>
                <p className="muted">
                  Imported from: {latestSourceContext.source_input_path ?? "Source path unavailable"}
                </p>
                <p className="muted">
                  Dataset source: {latestSourceSummary}
                </p>
                {latestSourceContext.pipeline_run_id ? (
                  <p className="muted">
                    Pipeline run: {latestSourceContext.pipeline_run_id}
                  </p>
                ) : null}
                {latestSourceTopics.length > 0 ? (
                  <p className="muted">
                    Topic hints: {latestSourceTopics.join(", ")}
                  </p>
                ) : null}
                {latestSourceBadges.length > 0 ? (
                  <p className="muted">
                    {latestSourceBadges.join(" | ")}
                  </p>
                ) : null}
                <div className="action-bar">
                  <button className="secondary-btn" type="button" onClick={() => setActiveScreen("imports")}>
                    Review Import History
                  </button>
                  {latestSourceContext.vendor_sources.length > 0 || latestSourceTopics.length > 0 ? (
                    <button
                      className="secondary-btn"
                      type="button"
                      onClick={() =>
                        openRetrievalInvestigation({
                          filters: {
                            text: "",
                            vendor: latestSourceContext.vendor_sources[0] ?? "",
                            topic: latestSourceTopics[0] ?? "",
                            status: "all",
                            from: "",
                            to: ""
                          },
                          suggestedName:
                            latestSourceTopics[0] ||
                            latestSourceContext.vendor_sources[0] ||
                            "Latest dataset import"
                        })
                      }
                    >
                      Find Imported Files
                    </button>
                  ) : null}
                  {latestSourceNeedsAttention ? (
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
                <strong>{datasetRun.latest.topic_segments}</strong>
                <p className="muted">Longer grouped conversation chunks organized by inferred topic.</p>
              </div>
              <div className="stat-card">
                <span className="label">Prompt/Response</span>
                <strong>{datasetRun.latest.prompt_response_pairs}</strong>
                <p className="muted">User prompt and assistant reply pairs that are easiest to review quickly.</p>
              </div>
              <div className="stat-card">
                <span className="label">Micro Segments</span>
                <strong>{datasetRun.latest.micro_segments}</strong>
                <p className="muted">Small message windows for search, spot checks, and lightweight review.</p>
              </div>
              <div className="stat-card">
                <span className="label">Private Review</span>
                <strong>{datasetRun.latest.private_review_segments}</strong>
                <p className="muted">Records that need extra care because signal or privacy rules were more sensitive.</p>
              </div>
            </div>
            <div className="action-bar">
              <button className="primary-btn" type="button" onClick={() => revealDesktopPath(datasetRun.datasetsRoot)}>
                Open Dataset Files
              </button>
              <button className="primary-btn" type="button" onClick={() => revealDesktopPath(datasetRun.manifestPath)}>
                Open Dataset Summary
              </button>
              <button className="secondary-btn" type="button" onClick={() => revealDesktopPath(artifactPaths.currentTopicSegments)}>
                Open Topic Segments
              </button>
              <button className="secondary-btn" type="button" onClick={() => revealDesktopPath(artifactPaths.currentPromptResponse)}>
                Open Prompt/Response
              </button>
              <button className="secondary-btn" type="button" onClick={() => revealDesktopPath(artifactPaths.currentMicroSegments)}>
                Open Micro Segments
              </button>
            </div>
          </>
        )}
      </div>

      <div className="panel">
        <h2>Dataset Notes</h2>
        {datasetRun?.latest ? (
          <>
            <p className="muted">Latest dataset build: {datasetRun.latest.run_id}</p>
            <p className="muted">Format version: {datasetRun.latest.dataset_version}</p>
            <p className="muted">Filtered out during cleanup: {datasetRun.latest.filtered_out_segments}</p>
            <p className="muted">
              High-signal sections: {datasetRun.latest.tiers.high_signal ?? 0} | Low-signal sections: {datasetRun.latest.tiers.low_signal ?? 0}
            </p>
            <p className="muted">
              Private-review sections are separated so you can inspect them before treating them as normal reusable data.
            </p>
            {latestSourceNeedsAttention ? (
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
          <li>Start with Latest Import Context when you want to know where this dataset came from and whether it used a recovery path.</li>
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
