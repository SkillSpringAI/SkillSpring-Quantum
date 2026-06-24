import { useEffect, useState } from "react";
import { loadLatestDatasetRun } from "../services/datasetRunBridge";
import { loadDatasetPreview } from "../services/datasetPreviewBridge";
import { loadMarkdownArchive } from "../services/markdownArchiveBridge";
import { revealDesktopPath } from "../services/pathBridge";
import OpenPathButton from "../components/OpenPathButton";
import type { AttachmentArchiveSummary } from "../types/markdownArchive";
import type {
  DatasetRunResult,
  DatasetSourceContext,
  DatasetRedactionSummary
} from "../types/datasetRun";
import type { DbRecord } from "../types/db";
import { useNavigation } from "../state/navigationContext";
import { useSettings } from "../state/settingsContext";
import {
  findMatchingDatasetRunDetails,
  type DatasetPreviewIntentKind
} from "../utils/datasetIntent";

function buildDatasetArtifactPaths(outputRoot: string) {
  return {
    dbRoot: outputRoot + "\\db",
    datasetsRoot: outputRoot + "\\datasets",
    currentRoot: outputRoot + "\\datasets\\current",
    manifestsRoot: outputRoot + "\\datasets\\manifests",
    runsRoot: outputRoot + "\\datasets\\runs",
    topicSegmentsVersionRoot: outputRoot + "\\datasets\\topic_segments",
    promptResponseVersionRoot: outputRoot + "\\datasets\\prompt_response_pairs",
    microSegmentsVersionRoot: outputRoot + "\\datasets\\micro_segments",
    currentTopicSegments: outputRoot + "\\datasets\\current\\topic_segments.jsonl",
    currentPromptResponse: outputRoot + "\\datasets\\current\\prompt_response_pairs.jsonl",
    currentMicroSegments: outputRoot + "\\datasets\\current\\micro_segments.jsonl",
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
  const [showDatasetGuide, setShowDatasetGuide] = useState(false);
  const [showAllDatasetOutputCards, setShowAllDatasetOutputCards] = useState(false);
  const [datasetRun, setDatasetRun] = useState<DatasetRunResult | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [previewKind, setPreviewKind] = useState<DatasetPreviewKind>("topic_segments");
  const [previewRecords, setPreviewRecords] = useState<DbRecord[]>([]);
  const [previewOffset, setPreviewOffset] = useState(0);
  const [previewHasMore, setPreviewHasMore] = useState(false);
  const [previewTotal, setPreviewTotal] = useState(0);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewStatus, setPreviewStatus] = useState("Loading dataset preview...");
  const [previewScope, setPreviewScope] = useState<{
    scope: "historical_run" | "latest_current_bundle";
    sourcePath: string;
    runId: string;
  } | null>(null);
  const [previewIntentSummary, setPreviewIntentSummary] = useState<{
    preferredKind: DatasetPreviewIntentKind;
    reason?: string;
    archiveTitle?: string;
    topic?: string;
    rawTopic?: string;
    vendor?: string;
    createdAt?: string;
  } | null>(null);
  const [attachmentSummaries, setAttachmentSummaries] = useState<AttachmentArchiveSummary[]>([]);
  const [archiveHandoffSummary, setArchiveHandoffSummary] = useState<{
    archiveTitle: string;
    archivePath?: string;
    vendor?: string;
    topic?: string;
    rawTopic?: string;
    createdAt?: string;
    supportTier?: "mvp_first_class" | "compatibility_fallback" | "unknown";
    hasAttachmentReferences?: boolean;
    hasPreservedAttachments?: boolean;
    hasMissingAttachments?: boolean;
    matchedRunId?: string;
    matchedConfidently: boolean;
    matchedVendor: boolean;
    matchedTopic: boolean;
  } | null>(null);

  useEffect(() => {
    loadLatestDatasetRun(settings.outputRoot, 8).then((result) => {
      setDatasetRun(result);
      setSelectedRunId(result.latest?.run_id ?? result.runs[0]?.run_id ?? null);
    });
    loadMarkdownArchive(settings.outputRoot).then((result) => {
      setAttachmentSummaries(result.attachmentSummaries);
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

    const match = findMatchingDatasetRunDetails(datasetRun.runs, datasetIntent);
    if (match.run) {
      setSelectedRunId(match.run.run_id);
    }
    if (datasetIntent.preferredPreviewKind) {
      setPreviewKind(datasetIntent.preferredPreviewKind);
      setPreviewOffset(0);
    }

    setArchiveHandoffSummary({
      archiveTitle: datasetIntent.archiveTitle ?? "Archive handoff",
      archivePath: datasetIntent.archivePath,
      vendor: datasetIntent.vendor,
      topic: datasetIntent.topic,
      rawTopic: datasetIntent.rawTopic,
      createdAt: datasetIntent.createdAt,
      supportTier: datasetIntent.supportTier,
      hasAttachmentReferences: datasetIntent.hasAttachmentReferences,
      hasPreservedAttachments: datasetIntent.hasPreservedAttachments,
      hasMissingAttachments: datasetIntent.hasMissingAttachments,
      matchedRunId: match.run?.run_id,
      matchedConfidently: match.score > 0,
      matchedVendor: match.matchedVendor,
      matchedTopic: match.matchedTopic
    });
    setPreviewIntentSummary({
      preferredKind: datasetIntent.preferredPreviewKind ?? "topic_segments",
      reason: datasetIntent.previewReason,
      archiveTitle: datasetIntent.archiveTitle,
      topic: datasetIntent.topic,
      rawTopic: datasetIntent.rawTopic,
      vendor: datasetIntent.vendor,
      createdAt: datasetIntent.createdAt
    });

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
  const selectedRunPaths = selectedRun
    ? {
        runRoot: artifactPaths.runsRoot + "\\" + selectedRun.run_id,
        topicSegments: artifactPaths.runsRoot + "\\" + selectedRun.run_id + "\\topic_segments.jsonl",
        promptResponse: artifactPaths.runsRoot + "\\" + selectedRun.run_id + "\\prompt_response_pairs.jsonl",
        microSegments: artifactPaths.runsRoot + "\\" + selectedRun.run_id + "\\micro_segments.jsonl",
        privateReview: artifactPaths.runsRoot + "\\" + selectedRun.run_id + "\\private_review_topic_segments.jsonl"
      }
    : null;
  const selectedSourceContext = selectedRun?.source_context;
  const selectedAttachmentTrust = buildAttachmentTrustPaths(
    datasetRun?.outputRoot ?? settings.outputRoot,
    selectedSourceContext?.vendor_sources ?? []
  );
  const selectedAttachmentSummary = findAttachmentSummaryForVendors(
    attachmentSummaries,
    selectedSourceContext?.vendor_sources ?? []
  );
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
  const datasetOutputCards = buildDatasetOutputCards(
    artifactPaths,
    selectedRunPaths,
    selectedSourceNeedsAttention
  );
  const visibleDatasetOutputCards = showAllDatasetOutputCards
    ? datasetOutputCards
    : datasetOutputCards.slice(0, 2);

  async function loadPreview(kind: DatasetPreviewKind, offset = 0) {
    if (!selectedRun) {
      setPreviewRecords([]);
      setPreviewOffset(0);
      setPreviewHasMore(false);
      setPreviewTotal(0);
      setPreviewStatus("No dataset run selected yet.");
      return;
    }

    setPreviewLoading(true);
    setPreviewStatus("Loading " + DATASET_PREVIEW_CONFIG[kind].label.toLowerCase() + "...");

    const result = await loadDatasetPreview({
      outputRoot: settings.outputRoot,
      runId: selectedRun.run_id,
      kind,
      limit: 5,
      offset
    });

    setPreviewRecords(result.records);
    setPreviewOffset(result.offset ?? offset);
    setPreviewHasMore(Boolean(result.hasMore));
    setPreviewTotal(result.totalRecords ?? result.records.length);
    setPreviewScope({
      scope: result.scope,
      sourcePath: result.sourcePath,
      runId: result.runId
    });
    setPreviewStatus(
      result.records.length > 0
        ? "Showing " +
            DATASET_PREVIEW_CONFIG[kind].label.toLowerCase() +
            " " +
            ((result.offset ?? offset) + 1) +
            " to " +
            ((result.offset ?? offset) + result.records.length) +
            (result.scope === "historical_run" ? " from the selected run snapshot." : " from the latest current bundle.")
        : "No " +
            DATASET_PREVIEW_CONFIG[kind].label.toLowerCase() +
            (result.scope === "historical_run"
              ? " available in the selected run snapshot."
              : " available in the latest current dataset output.")
    );
    setPreviewLoading(false);
  }

  useEffect(() => {
    loadPreview(previewKind, 0);
  }, [previewKind, settings.outputRoot, selectedRunId]);

  return (
    <section className="screen-grid">
      <div className="panel">
        <h2>Datasets</h2>
        {!selectedRun ? (
          <>
            <p className="muted">
              No dataset output yet. Import a conversation export first, then come back here to review it.
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
              Review the structured output from imported conversations here.
            </p>
            {archiveHandoffSummary ? (
              <div className="detail-box">
                <strong>Archive Handoff</strong>
                <p className="muted">
                  Opened from archive file: {archiveHandoffSummary.archiveTitle}
                </p>
                <p className="muted">
                  Dataset run: {archiveHandoffSummary.matchedConfidently
                    ? `matched ${archiveHandoffSummary.matchedRunId ?? "selected run"} from archive context`
                    : "no direct vendor/topic match found, so Quantum picked the closest available dataset run"}
                </p>
                <p className="muted">
                  Handoff context:
                  {" "}{[
                    archiveHandoffSummary.vendor ? "vendor " + archiveHandoffSummary.vendor : "",
                    archiveHandoffSummary.topic ? "topic " + archiveHandoffSummary.topic : "",
                    archiveHandoffSummary.rawTopic && archiveHandoffSummary.rawTopic !== archiveHandoffSummary.topic
                      ? "raw topic " + archiveHandoffSummary.rawTopic
                      : "",
                    archiveHandoffSummary.createdAt
                      ? "conversation date " + new Date(archiveHandoffSummary.createdAt).toLocaleString()
                      : "",
                    formatArchiveHandoffSupportTier(archiveHandoffSummary.supportTier)
                  ].filter(Boolean).join(" | ") || "limited archive metadata"}
                </p>
                <p className="muted">
                  Match signals:
                  {" "}{[
                    archiveHandoffSummary.matchedVendor ? "vendor matched" : "",
                    archiveHandoffSummary.matchedTopic ? "topic matched" : ""
                  ].filter(Boolean).join(" | ") || "best available fallback only"}
                </p>
                {buildArchiveHandoffBadges(archiveHandoffSummary).length > 0 ? (
                  <p className="muted">{buildArchiveHandoffBadges(archiveHandoffSummary).join(" | ")}</p>
                ) : null}
                <div className="action-bar">
                    {archiveHandoffSummary.archivePath ? (
                      <OpenPathButton className="secondary-btn" targetPath={archiveHandoffSummary.archivePath}>
                        Reopen Archive File
                      </OpenPathButton>
                    ) : null}
                  <button className="secondary-btn" type="button" onClick={() => setArchiveHandoffSummary(null)}>
                    Clear Handoff
                  </button>
                </div>
              </div>
            ) : null}
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
                  <div className="context-tip">
                    <strong>Vendor Package Handling</strong>
                    <p className="muted">
                      {selectedSourceContext.package_companion_files} companion file(s) were expected parts of the vendor export package and were handled through the main import file instead of being added as separate dataset sources.
                    </p>
                    <p className="muted">
                      This is normal package routing, not a partial-import failure. The dataset above was built from the package's authoritative main file while companion files stayed out of the dataset flow.
                    </p>
                    {selectedSourceContext.package_companion_examples && selectedSourceContext.package_companion_examples.length > 0 ? (
                      <p className="muted">
                        Examples: {selectedSourceContext.package_companion_examples.join(", ")}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {shouldRecommendGovernance(selectedRun) ? (
                  <div className="context-tip">
                    <strong>Power-user option</strong>
                    <p className="muted">
                      If you want to tune privacy handling or review thresholds, open <strong>More Tools</strong> in the sidebar, then choose <strong>Governance</strong>.
                    </p>
                  </div>
                ) : null}
                {selectedAttachmentSummary && (selectedSourceContext.attachment_count ?? 0) > 0 ? (
                  <p className="muted">
                    Attachment preservation: {selectedAttachmentSummary.attachmentsArchived} preserved | {selectedAttachmentSummary.attachmentsMissing} missing | {selectedAttachmentSummary.attachmentsReferenced} referenced for this vendor export family.
                  </p>
                ) : null}
                <div className="action-bar">
                  <button className="secondary-btn" type="button" onClick={() => setActiveScreen("imports")}>
                    Back To Imports
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
                      Search Imported Files
                    </button>
                  ) : null}
                  {selectedAttachmentTrust && (selectedSourceContext.attachment_count ?? 0) > 0 ? (
                    <OpenPathButton className="secondary-btn" targetPath={selectedAttachmentTrust.archiveRoot}>
                      Open Preserved Attachments
                    </OpenPathButton>
                  ) : null}
                  {selectedSourceNeedsAttention ? (
                    <OpenPathButton className="secondary-btn" targetPath={artifactPaths.diagnostics}>
                      Open Latest Diagnostics
                    </OpenPathButton>
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
              <OpenPathButton className="primary-btn" targetPath={selectedManifestPath}>
                Open Selected Dataset Summary
              </OpenPathButton>
              <OpenPathButton className="secondary-btn" targetPath={datasetRun.datasetsRoot}>
                Open Dataset Folder
              </OpenPathButton>
              <OpenPathButton className="secondary-btn" targetPath={artifactPaths.currentRoot}>
                Open Current Bundle
              </OpenPathButton>
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
            <div className="detail-box">
              <strong>What You Are Looking At</strong>
              <p className="muted">
                Selected historical run: {selectedRun.run_id}
              </p>
              <p className="muted">
                Latest run in this output folder: {datasetRun?.latest?.run_id ?? selectedRun.run_id}
              </p>
              <p className="muted">
                Preview currently reads from: {formatPreviewScopeLabel(previewScope?.scope)}
              </p>
              {selectedRun && datasetRun?.latest && selectedRun.run_id !== datasetRun.latest.run_id ? (
                <p className="muted">
                  You are reviewing an older run summary. Snapshot files keep this screen aligned to that older run, and any fallback to the current bundle is called out below.
                </p>
              ) : (
                <p className="muted">
                  You are reviewing the latest run, so the selected summary and current bundle should usually point at the same dataset build.
                </p>
              )}
            </div>
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
                This dataset came from a recovery-path import. That does not mean the import failed, but it does mean you should spot-check archive preservation, preview output, or diagnostics before treating every record as equally complete.
              </p>
            ) : (
              <p className="muted">
                This dataset came from the latest completed import run and is ready for normal review.
              </p>
            )}
            {(selectedSourceContext?.package_companion_files ?? 0) > 0 ? (
              <p className="muted">
                Companion package files were handled intentionally through the main vendor export file, so they should not be read as missing dataset inputs or skipped failures.
              </p>
            ) : null}
            <div className="action-bar">
                <OpenPathButton className="secondary-btn" targetPath={artifactPaths.currentPrivateReview}>
                  Open Private Review File
                </OpenPathButton>
                <OpenPathButton className="secondary-btn" targetPath={artifactPaths.diagnostics}>
                  Open Latest Diagnostics
                </OpenPathButton>
                <OpenPathButton className="secondary-btn" targetPath={artifactPaths.dbRoot}>
                  Open Private Review Folder
                </OpenPathButton>
            </div>
          </>
        ) : (
          <p className="muted">
            After your first dataset-producing import, this screen will summarize the latest structured output here.
          </p>
        )}
      </div>

      <div className="panel large">
        <h2>Open Files</h2>
        {selectedRun ? (
          <>
            <p className="muted">
              Use this section when you want the raw files behind the summary and preview. Start with the selected run summary unless you already know which dataset format you need.
            </p>
            <div className="detail-box">
              <strong>Start Here</strong>
              <p className="muted">
                Start with the selected run summary or snapshot folder. Only drop into individual dataset files when you already know which format you need.
              </p>
              {selectedRunPaths && datasetRun?.latest && selectedRun.run_id !== datasetRun.latest.run_id ? (
                <p className="muted">
                  You are inspecting an older dataset run summary right now. Quantum will use the selected run snapshot for preview when that snapshot file exists.
                </p>
              ) : null}
              {selectedRunPaths ? (
                <div className="artifact-handoff-grid">
                  <div className="stat-card">
                    <span className="label">Stable Snapshot</span>
                    <strong>{selectedRun.run_id}</strong>
                    <p className="muted">
                      Use this when you want selected-run files that match the historical dataset summary and preview context shown on this screen.
                    </p>
                  </div>
                  <div className="stat-card">
                    <span className="label">Rolling Bundle</span>
                    <strong>{datasetRun?.latest?.run_id ?? "Latest current bundle"}</strong>
                    <p className="muted">
                      Use this when another step should consume the newest accumulated files even if they no longer match the older run selected here.
                    </p>
                  </div>
                </div>
              ) : null}
              <div className="action-bar">
                <OpenPathButton className="primary-btn" targetPath={selectedManifestPath}>
                  Open Selected Run Summary
                </OpenPathButton>
                {selectedRunPaths ? (
                  <OpenPathButton className="secondary-btn" targetPath={selectedRunPaths.runRoot}>
                    Open Run Snapshot Folder
                  </OpenPathButton>
                ) : null}
                <OpenPathButton className="secondary-btn" targetPath={artifactPaths.currentRoot}>
                  Open Current Bundle Folder
                </OpenPathButton>
                {selectedRunPaths && datasetRun?.latest && selectedRun.run_id !== datasetRun.latest.run_id ? (
                  <button className="secondary-btn" type="button" onClick={() => setSelectedRunId(datasetRun.latest?.run_id ?? null)}>
                    Switch To Latest Run
                  </button>
                ) : null}
              </div>
            </div>
            <div className="stats-grid two-col">
              {visibleDatasetOutputCards.map((card) => (
                <div key={card.label} className="stat-card">
                  <span className="label">{card.label}</span>
                  <strong>{card.title}</strong>
                  <p className="muted">{card.note}</p>
                  <p className="muted">{card.trustNote}</p>
                  <div className="action-bar">
                    {card.runPath ? (
                      <OpenPathButton className="primary-btn" targetPath={card.runPath}>
                        Open Selected Run File
                      </OpenPathButton>
                    ) : null}
                    <OpenPathButton className="secondary-btn" targetPath={card.currentPath}>
                      Open Current File
                    </OpenPathButton>
                  </div>
                  <p className="muted">{card.handoffNote}</p>
                </div>
              ))}
            </div>
            {datasetOutputCards.length > 2 ? (
              <div className="action-bar">
                <button
                  className="secondary-btn"
                  type="button"
                  onClick={() => setShowAllDatasetOutputCards((value) => !value)}
                >
                  {showAllDatasetOutputCards ? "Show Fewer Dataset Types" : "Show All Dataset Types"}
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <p className="muted">
            Dataset output controls appear after a dataset-producing import is available.
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
          Preview dataset records inside the app before opening raw files. When available, Quantum uses the selected run snapshot instead of always falling back to the latest current bundle.
        </p>
        {previewIntentSummary ? (
          <div className="detail-box">
            <strong>Archive Preview Handoff</strong>
            <p className="muted">
              Started in: {DATASET_PREVIEW_CONFIG[previewIntentSummary.preferredKind].label}
            </p>
            <p className="muted">
              Archive context:
              {" "}{[
                previewIntentSummary.archiveTitle ? "file " + previewIntentSummary.archiveTitle : "",
                previewIntentSummary.vendor ? "vendor " + previewIntentSummary.vendor : "",
                previewIntentSummary.topic ? "topic " + previewIntentSummary.topic : "",
                previewIntentSummary.rawTopic && previewIntentSummary.rawTopic !== previewIntentSummary.topic
                  ? "raw topic " + previewIntentSummary.rawTopic
                  : "",
                previewIntentSummary.createdAt
                  ? "conversation date " + new Date(previewIntentSummary.createdAt).toLocaleString()
                  : ""
              ].filter(Boolean).join(" | ") || "limited archive metadata"}
            </p>
            {previewIntentSummary.reason ? (
              <p className="muted">{previewIntentSummary.reason}</p>
            ) : null}
          </div>
        ) : null}
        <div className="detail-box">
          <strong>Preview Scope</strong>
          <p className="muted">
            Selected run summary: {selectedRun ? selectedRun.run_id : "No run selected"}
          </p>
          <p className="muted">
            Preview source: {formatPreviewScopeLabel(previewScope?.scope)}
          </p>
          {previewScope?.sourcePath ? (
            <p className="muted">
              Preview source file: {previewScope.sourcePath}
            </p>
          ) : null}
          {selectedRun && datasetRun?.latest && selectedRun.run_id !== datasetRun.latest.run_id ? (
            previewScope?.scope === "historical_run" ? (
              <p className="muted">
                These preview cards are following the selected historical snapshot, so the preview stays aligned with the older run you chose.
              </p>
            ) : (
              <p className="muted">
                The selected older run does not have the needed snapshot file for this preview mode, so Quantum is showing the latest current bundle instead.
              </p>
            )
          ) : (
            <p className="muted">
              The selected run summary and the in-app preview are aligned to the same dataset scope.
            </p>
          )}
          {previewIntentSummary ? (
            <p className="muted">
              Preview mode was chosen from the selected archive file context, but you can switch modes below if you want a different dataset surface.
            </p>
          ) : null}
        </div>
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
            Import context: {selectedSourceSummary} | Privacy handling: {selectedRedactionExplanation}
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
        <h2>How To Use This</h2>
        <p className="muted">
          Start with topic segments for the clearest review. Use prompt/response for faster scanning. Use private review only when a run needs extra caution.
        </p>
        <div className="action-bar">
          <button className="secondary-btn" type="button" onClick={() => setShowDatasetGuide((value) => !value)}>
            {showDatasetGuide ? "Hide Tips" : "Show Tips"}
          </button>
        </div>
        {showDatasetGuide ? (
          <ul className="list">
            <li>Start with topic segments when you want the easiest human-readable review.</li>
            <li>Use prompt/response when you want compact examples instead of longer thread context.</li>
            <li>Use Open Files only when you need the raw dataset artifacts, not just the in-app preview.</li>
            <li>Privacy handling tells you whether common sensitive details were masked before records were written.</li>
          </ul>
        ) : null}
      </div>
    </section>
  );
}

function formatArchiveHandoffSupportTier(
  supportTier?: "mvp_first_class" | "compatibility_fallback" | "unknown"
): string {
  switch (supportTier) {
    case "mvp_first_class":
      return "ready-now archive path";
    case "compatibility_fallback":
      return "recovery-path archive source";
    case "unknown":
      return "unlabeled archive source";
    default:
      return "";
  }
}

function buildArchiveHandoffBadges(summary: {
  supportTier?: "mvp_first_class" | "compatibility_fallback" | "unknown";
  hasAttachmentReferences?: boolean;
  hasPreservedAttachments?: boolean;
  hasMissingAttachments?: boolean;
}): string[] {
  const badges: string[] = [];

  if (summary.supportTier === "mvp_first_class") {
    badges.push("ready-now archive handoff");
  } else if (summary.supportTier === "compatibility_fallback") {
    badges.push("recovery-path archive handoff");
  }

  if (summary.hasAttachmentReferences) {
    badges.push("attachment references");
  }

  if (summary.hasPreservedAttachments) {
    badges.push("preserved attachments");
  }

  if (summary.hasMissingAttachments) {
    badges.push("missing attachment risk");
  }

  return badges;
}

function formatPreviewScopeLabel(scope?: "historical_run" | "latest_current_bundle"): string {
  if (scope === "historical_run") {
    return "selected historical run snapshot";
  }

  if (scope === "latest_current_bundle") {
    return "latest current bundle";
  }

  return "dataset preview unavailable";
}
type DatasetPreviewKind = DatasetPreviewIntentKind;

const DATASET_PREVIEW_CONFIG: Record<
  DatasetPreviewKind,
  { label: string; description: string }
> = {
  topic_segments: {
    label: "Topic Segments",
    description: "Longer conversation chunks with signal and redaction context."
  },
  prompt_response_pairs: {
    label: "Prompt/Response",
    description: "Direct question and answer pairs for faster spot-checking."
  },
  micro_segments: {
    label: "Micro Segments",
    description: "Small message windows for quick scanning and retrieval checks."
  },
  private_review: {
    label: "Private Review",
    description: "Segments that need extra trust or privacy caution before normal reuse."
  }
};

function buildDatasetOutputCards(
  artifactPaths: ReturnType<typeof buildDatasetArtifactPaths>,
  selectedRunPaths: {
    runRoot: string;
    topicSegments: string;
    promptResponse: string;
    microSegments: string;
    privateReview: string;
  } | null,
  selectedSourceNeedsAttention: boolean
): Array<{
  label: string;
  title: string;
  note: string;
  trustNote: string;
  handoffNote: string;
  currentPath: string;
  runPath?: string;
  currentFolderPath: string;
  folderPath: string;
}> {
  return [
    {
      label: "Topic Segments",
      title: "Best for context-rich dataset review",
      note: "Choose this when you want the clearest topic-organized conversation chunks.",
      trustNote: selectedSourceNeedsAttention
        ? "Selected run used a recovery path, so this is a good first file to spot-check for completeness."
        : "This is usually the best first file when you want to validate overall dataset quality.",
      handoffNote: "Selected run file stays aligned with the summary and preview above. Current file is the rolling latest version of this dataset type.",
      currentPath: artifactPaths.currentTopicSegments,
      currentFolderPath: artifactPaths.currentRoot,
      runPath: selectedRunPaths?.topicSegments,
      folderPath: selectedRunPaths?.runRoot ?? artifactPaths.runsRoot
    },
    {
      label: "Prompt/Response Pairs",
      title: "Best for quick QA-style review",
      note: "Choose this when you want compact question-and-answer examples instead of longer threaded context.",
      trustNote: "This view is easiest for fast manual checks, but it shows less surrounding conversation context than topic segments.",
      handoffNote: "Use the selected run file for historical review packs. Use the current file when another step should consume the newest prompt/response export.",
      currentPath: artifactPaths.currentPromptResponse,
      currentFolderPath: artifactPaths.currentRoot,
      runPath: selectedRunPaths?.promptResponse,
      folderPath: selectedRunPaths?.runRoot ?? artifactPaths.runsRoot
    },
    {
      label: "Micro Segments",
      title: "Best for spot checks and retrieval",
      note: "Choose this when you want smaller windows for search, lightweight review, or downstream retrieval use.",
      trustNote: "Micro segments are compact and useful for search-oriented tasks, but they intentionally trade away some broader thread context.",
      handoffNote: "Selected run file preserves the snapshot you are inspecting. Current file follows the newest retrieval-oriented export.",
      currentPath: artifactPaths.currentMicroSegments,
      currentFolderPath: artifactPaths.currentRoot,
      runPath: selectedRunPaths?.microSegments,
      folderPath: selectedRunPaths?.runRoot ?? artifactPaths.runsRoot
    },
    {
      label: "Private Review",
      title: "Best for the most sensitive records",
      note: "Choose this when you want the records that were separated for extra trust or privacy caution.",
      trustNote: "Treat this as the highest-caution dataset surface before normal reuse or promotion decisions.",
      handoffNote: "Selected run private review stays tied to this run snapshot. Current private review file reflects the latest overall caution queue.",
      currentPath: artifactPaths.currentPrivateReview,
      runPath: selectedRunPaths?.privateReview,
      currentFolderPath: artifactPaths.dbRoot,
      folderPath: selectedRunPaths?.runRoot ?? artifactPaths.dbRoot
    }
  ];
}

function buildAttachmentTrustPaths(
  outputRoot: string,
  vendors: string[]
): { manifestPath: string; archiveRoot: string } | null {
  const normalized = vendors.map((vendor) => vendor.toLowerCase());

  if (normalized.includes("grok")) {
    return {
      manifestPath: outputRoot + "\\db\\manifests\\latest-grok-attachment-archive.json",
      archiveRoot: outputRoot + "\\source_archive\\grok_attachments"
    };
  }

  if (normalized.includes("gemini")) {
    return {
      manifestPath: outputRoot + "\\db\\manifests\\latest-gemini-attachment-archive.json",
      archiveRoot: outputRoot + "\\source_archive\\gemini_attachments"
    };
  }

  return null;
}

function findAttachmentSummaryForVendors(
  summaries: AttachmentArchiveSummary[],
  vendors: string[]
): AttachmentArchiveSummary | null {
  const normalizedVendors = vendors.map((vendor) => vendor.toLowerCase());
  return summaries.find((summary) => normalizedVendors.includes(summary.vendor)) ?? null;
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
      note: "These were expected vendor package companions that Quantum routed through the main export file, not missing or failed dataset inputs."
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
