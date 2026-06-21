import { useEffect, useState } from "react";
import { loadLatestDatasetRun } from "../services/datasetRunBridge";
import { queryCollection } from "../services/dbBridge";
import { revealDesktopPath } from "../services/pathBridge";
import type {
  DatasetRunResult,
  DatasetSourceContext,
  DatasetRedactionSummary
} from "../types/datasetRun";
import type { DbRecord, DbTier } from "../types/db";
import { useNavigation } from "../state/navigationContext";
import { useSettings } from "../state/settingsContext";
import { findMatchingDatasetRun } from "../utils/datasetIntent";

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
  const {
    setActiveScreen,
    openRetrievalInvestigation,
    datasetIntent,
    clearDatasetIntent
  } = useNavigation();
  const { settings } = useSettings();
  const [datasetRun, setDatasetRun] = useState<DatasetRunResult | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [previewKind, setPreviewKind] = useState<DatasetPreviewKind>("topic_segments");
  const [previewRecords, setPreviewRecords] = useState<DbRecord[]>([]);
  const [previewOffset, setPreviewOffset] = useState(0);
  const [previewHasMore, setPreviewHasMore] = useState(false);
  const [previewTotal, setPreviewTotal] = useState(0);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewStatus, setPreviewStatus] = useState("Loading dataset preview...");

  useEffect(() => {
    loadLatestDatasetRun(settings.outputRoot, 8).then((result) => {
      setDatasetRun(result);
      setSelectedRunId(result.latest?.run_id ?? result.runs[0]?.run_id ?? null);
    });
  }, [settings.outputRoot]);

  useEffect(() => {
    if (!datasetRun) return;
    const exists = datasetRun.runs.some((run) => run.run_id === selectedRunId);
    if (!exists) {
      setSelectedRunId(datasetRun.latest?.run_id ?? datasetRun.runs[0]?.run_id ?? null);
    }
  }, [datasetRun, selectedRunId]);

  useEffect(() => {
    if (!datasetIntent || !datasetRun?.runs.length) {
      return;
    }

    const matchingRun = findMatchingDatasetRun(datasetRun.runs, datasetIntent);
    if (matchingRun) {
      setSelectedRunId(matchingRun.run_id);
    }

    clearDatasetIntent();
  }, [datasetIntent, datasetRun, clearDatasetIntent]);

  const selectedRun =
    datasetRun?.runs.find((run) => run.run_id === selectedRunId) ??
    datasetRun?.latest ??
    null;
  const artifactPaths = buildDatasetArtifactPaths(datasetRun?.outputRoot ?? settings.outputRoot);
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
  const selectedTrustHighlights = summarizeDatasetTrustHighlights(selectedRun);
  const selectedRedactionHighlights = summarizeDatasetRedactionHighlights(
    selectedRedactionSummary,
    selectedRun?.private_review_segments ?? 0
  );
  const previewConfig = DATASET_PREVIEW_CONFIG[previewKind];

  async function loadPreview(kind: DatasetPreviewKind, offset = 0) {
    setPreviewLoading(true);
    setPreviewStatus("Loading " + DATASET_PREVIEW_CONFIG[kind].label.toLowerCase() + "...");

    const result = await queryCollection({
      outputRoot: settings.outputRoot,
      tier: DATASET_PREVIEW_CONFIG[kind].tier,
      collection: DATASET_PREVIEW_CONFIG[kind].collection,
      limit: 5,
      offset
    });

    setPreviewRecords(result.records);
    setPreviewOffset(result.offset ?? offset);
    setPreviewHasMore(Boolean(result.hasMore));
    setPreviewTotal(result.totalRecords ?? result.records.length);
    setPreviewStatus(
      result.records.length > 0
        ? "Showing " +
            DATASET_PREVIEW_CONFIG[kind].label.toLowerCase() +
            " " +
            ((result.offset ?? offset) + 1) +
            " to " +
            ((result.offset ?? offset) + result.records.length) +
            "."
        : "No " + DATASET_PREVIEW_CONFIG[kind].label.toLowerCase() + " available in the current dataset output."
    );
    setPreviewLoading(false);
  }

  useEffect(() => {
    loadPreview(previewKind, 0);
  }, [previewKind, settings.outputRoot]);

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
                {selectedTrustHighlights.length > 0 ? (
                  <div className="stats-grid two-col">
                    {selectedTrustHighlights.map((detail) => (
                      <div key={detail.label} className="stat-card">
                        <span className="label">{detail.label}</span>
                        <strong>{detail.value}</strong>
                        <p className="muted">{detail.note}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
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
                {(selectedSourceContext.package_companion_files ?? 0) > 0 ? (
                  <p className="muted">
                    Vendor package handling: {selectedSourceContext.package_companion_files} companion file(s) were kept out of the dataset flow and handled through the main import file
                    {selectedSourceContext.package_companion_examples && selectedSourceContext.package_companion_examples.length > 0
                      ? " (" + selectedSourceContext.package_companion_examples.join(", ") + ")"
                      : ""}.
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
            {selectedRedactionHighlights.length > 0 ? (
              <div className="stats-grid two-col">
                {selectedRedactionHighlights.map((detail) => (
                  <div key={detail.label} className="stat-card">
                    <span className="label">{detail.label}</span>
                    <strong>{detail.value}</strong>
                    <p className="muted">{detail.note}</p>
                  </div>
                ))}
              </div>
            ) : null}
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

      <div className="panel large">
        <div className="panel-heading-row">
          <h2>Dataset Preview</h2>
          <button
            className="secondary-btn"
            type="button"
            onClick={() => loadPreview(previewKind, previewOffset)}
            disabled={previewLoading}
          >
            Refresh Preview
          </button>
        </div>
        <p className="muted">
          Preview current dataset records inside the app before opening raw files. This reflects the current output folder contents, which may be newer than the selected historical run summary.
        </p>
        <div className="action-bar">
          {(
            Object.keys(DATASET_PREVIEW_CONFIG) as DatasetPreviewKind[]
          ).map((kind) => (
            <button
              key={kind}
              className={previewKind === kind ? "primary-btn" : "secondary-btn"}
              type="button"
              onClick={() => {
                setPreviewKind(kind);
                setPreviewOffset(0);
              }}
            >
              {DATASET_PREVIEW_CONFIG[kind].label}
            </button>
          ))}
        </div>
        <div className="detail-box">
          <strong>{previewConfig.label}</strong>
          <p className="muted">{previewConfig.description}</p>
          <p className="muted">
            Trust context: {selectedSourceSummary} | Privacy handling: {selectedRedactionExplanation}
          </p>
          {selectedSourceBadges.length > 0 ? (
            <p className="muted">{selectedSourceBadges.join(" | ")}</p>
          ) : null}
          <p className="muted">{previewStatus}</p>
        </div>
        <div className="action-bar">
          <button
            className="secondary-btn"
            type="button"
            onClick={() => loadPreview(previewKind, Math.max(0, previewOffset - 5))}
            disabled={previewLoading || previewOffset === 0}
          >
            Previous Page
          </button>
          <button
            className="secondary-btn"
            type="button"
            onClick={() => loadPreview(previewKind, previewOffset + 5)}
            disabled={previewLoading || !previewHasMore}
          >
            Next Page
          </button>
          <span className="muted">
            {previewRecords.length > 0
              ? `Showing ${previewOffset + 1}-${previewOffset + previewRecords.length}${previewTotal ? ` of ${previewTotal}` : ""}`
              : "No preview records loaded"}
          </span>
        </div>
        {previewRecords.length === 0 ? (
          <p className="muted">
            No records are available for this preview mode yet. Try another dataset type or run an import that produces dataset output.
          </p>
        ) : (
          <div className="stats-grid two-col">
            {previewRecords.map((record) => {
              const preview = summarizePreviewRecord(previewKind, record.raw);
              return (
                <div key={record.id} className="stat-card">
                  <span className="label">{preview.kicker}</span>
                  <strong>{preview.title}</strong>
                  <p className="muted">{preview.meta}</p>
                  <div className="record-block">{preview.body}</div>
                </div>
              );
            })}
          </div>
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

type DatasetPreviewKind =
  | "topic_segments"
  | "prompt_response_pairs"
  | "micro_segments"
  | "private_review";

const DATASET_PREVIEW_CONFIG: Record<
  DatasetPreviewKind,
  { label: string; description: string; tier: DbTier; collection: string }
> = {
  topic_segments: {
    label: "Topic Segments",
    description: "Longer conversation chunks with signal and redaction context.",
    tier: "tier1_processed",
    collection: "topic_segments"
  },
  prompt_response_pairs: {
    label: "Prompt/Response",
    description: "Direct question and answer pairs for faster spot-checking.",
    tier: "tier1_processed",
    collection: "prompt_response_pairs"
  },
  micro_segments: {
    label: "Micro Segments",
    description: "Small message windows for quick scanning and retrieval checks.",
    tier: "tier1_processed",
    collection: "micro_segments"
  },
  private_review: {
    label: "Private Review",
    description: "Segments that need extra trust or privacy caution before normal reuse.",
    tier: "tier3_private_review",
    collection: "topic_segments"
  }
};

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
  if ((sourceContext.package_companion_files ?? 0) > 0) {
    parts.push(sourceContext.package_companion_files + " package companion file(s) handled");
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
  if ((sourceContext.package_companion_files ?? 0) > 0) {
    badges.push(sourceContext.package_companion_files + " package companion file(s) handled");
  }
  return badges;
}

function summarizeDatasetTrustHighlights(
  run: DatasetRunResult["runs"][number] | null
): Array<{ label: string; value: string; note: string }> {
  if (!run) {
    return [];
  }

  const sourceContext = run.source_context;
  const supportTier = sourceContext?.support_tier;
  const highlights: Array<{ label: string; value: string; note: string }> = [
    {
      label: "Import Path",
      value:
        supportTier === "mvp_first_class"
          ? "Ready-now path"
          : supportTier === "mvp_compatibility_fallback"
            ? "Recovery path"
            : "Unlabeled path",
      note:
        supportTier === "mvp_compatibility_fallback"
          ? "This dataset came through a fallback import route, so completeness deserves a closer spot-check."
          : "This dataset came through the normal import path for the detected source."
    },
    {
      label: "Vendor Source",
      value: sourceContext?.vendor_sources.join(", ") || sourceContext?.detected_label || "Unknown",
      note: "Use this to confirm the dataset still matches the export family you expected to import."
    }
  ];

  if ((sourceContext?.attachment_count ?? 0) > 0) {
    highlights.push({
      label: "Attachment References",
      value: String(sourceContext?.attachment_count ?? 0),
      note: "The source export referenced uploaded or linked files. Check archive preservation if those matter for interpretation."
    });
  }

  if ((sourceContext?.package_companion_files ?? 0) > 0) {
    highlights.push({
      label: "Companion Files",
      value: String(sourceContext?.package_companion_files ?? 0),
      note: "Extra package files were recognized and kept out of dataset generation so the main export file stayed authoritative."
    });
  }

  return highlights;
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

function summarizeDatasetRedactionHighlights(
  redactionSummary: DatasetRedactionSummary | undefined,
  privateReviewSegments: number
): Array<{ label: string; value: string; note: string }> {
  const highlights: Array<{ label: string; value: string; note: string }> = [];
  const totalRedactions = redactionSummary?.total_redactions ?? 0;
  const affectedSegments = redactionSummary?.affected_segments ?? 0;

  highlights.push({
    label: "Redacted Segments",
    value: String(affectedSegments),
    note:
      affectedSegments > 0
        ? "These segments had common sensitive patterns removed before dataset records were written."
        : "No counted email, phone, URL, or address patterns were redacted in this dataset run."
  });

  highlights.push({
    label: "Total Redactions",
    value: String(totalRedactions),
    note:
      totalRedactions > 0
        ? "This is the total number of counted redaction events across all affected segments."
        : "Nothing in the counted redaction categories needed masking in the generated dataset."
  });

  const topType = redactionSummary
    ? Object.entries(redactionSummary.redaction_types).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]
    : null;
  highlights.push({
    label: "Most Common Mask",
    value: topType ? formatRedactionFlagLabel(topType[0], topType[1]) : "None counted",
    note: topType
      ? "This was the most frequently redacted sensitive pattern in the selected dataset run."
      : "No counted redaction category dominated this run."
  });

  highlights.push({
    label: "Private Review Hold",
    value: String(privateReviewSegments),
    note:
      privateReviewSegments > 0
        ? "These segments were held aside for extra caution, even if their redaction count alone did not fully explain the risk."
        : "No segments were separated into private review for extra trust or privacy checking."
  });

  return highlights;
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

function summarizePreviewRecord(
  kind: DatasetPreviewKind,
  raw: unknown
): { kicker: string; title: string; meta: string; body: string } {
  const record = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  if (kind === "prompt_response_pairs") {
    const prompt = readString(record.prompt);
    const response = readString(record.response);
    return {
      kicker: "Prompt/Response",
      title: readString(record.title) || readString(record.topic) || "Untitled pair",
      meta: [
        readString(record.signal_tier),
        readString(record.created_at) ? new Date(readString(record.created_at) as string).toLocaleString() : "",
        "conversation " + (readString(record.conversation_id) || "unknown")
      ].filter(Boolean).join(" | "),
      body: "Prompt: " + truncateText(prompt, 220) + "\n\nResponse: " + truncateText(response, 260)
    };
  }

  if (kind === "micro_segments") {
    const messages = Array.isArray(record.messages)
      ? record.messages
          .map((message) => {
            if (!message || typeof message !== "object") return "";
            const value = message as Record<string, unknown>;
            return "[" + (readString(value.role) || "unknown") + "] " + (readString(value.text) || "");
          })
          .filter(Boolean)
      : [];

    return {
      kicker: "Micro Segment",
      title: readString(record.title) || readString(record.topic) || "Untitled micro segment",
      meta: [
        readString(record.signal_tier),
        "sequence " + (typeof record.sequence_index === "number" ? record.sequence_index : "?"),
        "conversation " + (readString(record.conversation_id) || "unknown")
      ].filter(Boolean).join(" | "),
      body: truncateText(messages.join("\n\n"), 420)
    };
  }

  const redactionCount =
    typeof record.redaction_count === "number" ? String(record.redaction_count) + " redaction(s)" : "";
  const signalScore =
    typeof record.signal_score === "number" ? "score " + record.signal_score : "";

  return {
    kicker: kind === "private_review" ? "Private Review Segment" : "Topic Segment",
    title: readString(record.title) || readString(record.topic) || "Untitled segment",
    meta: [
      readString(record.signal_tier),
      signalScore,
      redactionCount,
      typeof record.message_count === "number" ? record.message_count + " message(s)" : "",
      "conversation " + (readString(record.conversation_id) || "unknown")
    ].filter(Boolean).join(" | "),
    body: truncateText(readString(record.text), 420)
  };
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function truncateText(value: string, max = 240): string {
  const normalized = value.trim();
  if (!normalized) {
    return "No preview text available.";
  }

  return normalized.length > max ? normalized.slice(0, max).trimEnd() + "..." : normalized;
}
