import { useState } from "react";
import type {
  ImportFileMetadata,
  ImportHistoryFilters,
  ImportHistoryResult,
  ImportRunSummary,
  ImportSupportTier
} from "../types/importHistory";
import { revealDesktopPath } from "../services/pathBridge";
import {
  countPackageCompanionSkips,
  countUnexpectedSkippedFiles,
  isPackageCompanionSkip
} from "../utils/importTrust";

interface ImportHistoryPanelProps {
  history: ImportHistoryResult | null;
  selectedRun: ImportRunSummary | null;
  onSelectRun: (run: ImportRunSummary) => void;
  onRefresh?: () => void;
  onSearch?: (filters: ImportHistoryFilters) => Promise<void> | void;
  onResetSearch?: () => Promise<void> | void;
  onOpenRunInRetrieval?: (run: ImportRunSummary, filters: ImportHistoryFilters) => void;
  onOpenResultInRetrieval?: (run: ImportRunSummary, resultPath: string, filters: ImportHistoryFilters) => void;
  searchMode?: "recent" | "query";
  searchBusy?: boolean;
}

function findLatestArchiveArtifactPath(run: ImportRunSummary | null): string | null {
  if (!run) {
    return null;
  }

  const preferred = run.artifacts.find((artifact) => artifact.label === "Latest archived markdown");
  if (preferred) {
    return preferred.path;
  }

  const fallback = run.artifacts.find((artifact) =>
    artifact.label.toLowerCase().includes("archived markdown") ||
    artifact.label.toLowerCase().includes("markdown archive")
  );

  return fallback?.path ?? null;
}

function findLatestDatasetArtifactPath(run: ImportRunSummary | null): string | null {
  if (!run) {
    return null;
  }

  const preferredLabels = [
    "Current prompt/response dataset",
    "Current topic segments dataset",
    "Latest dataset manifest"
  ];

  for (const label of preferredLabels) {
    const match = run.artifacts.find((artifact) => artifact.label === label);
    if (match) {
      return match.path;
    }
  }

  const fallback = run.artifacts.find((artifact) => {
    const label = artifact.label.toLowerCase();
    return label.includes("dataset") || label.includes("prompt/response");
  });

  return fallback?.path ?? null;
}

function summarizeRunOutcomeCounts(run: ImportRunSummary): string {
  const archivedOnly =
    run.archivedOnlyFiles ??
    run.results.filter(
      (result) =>
        result.metadata?.sourceCategory === "document" &&
        result.metadata.parseStatus === "binary_archived_only"
    ).length;
  const recoveryPath =
    run.recoveryPathFiles ??
    run.results.filter(
      (result) =>
        result.metadata?.sourceCategory === "conversation" &&
        result.metadata.supportTier === "mvp_compatibility_fallback"
    ).length;

  const companionSkips = countPackageCompanionSkips(run);
  const unexpectedSkips = countUnexpectedSkippedFiles(run);
  const parts = [
    run.filesImported + " imported",
    run.filesFailed + " failed",
    unexpectedSkips + " skipped"
  ];

  if (archivedOnly > 0) {
    parts.push(archivedOnly + " archived only");
  }

  if (recoveryPath > 0) {
    parts.push(recoveryPath + " recovery path");
  }

  if (companionSkips > 0) {
    parts.push(companionSkips + " package companion file(s) handled");
  }

  return parts.join(", ");
}

export default function ImportHistoryPanel({
  history,
  selectedRun,
  onSelectRun,
  onRefresh,
  onSearch,
  onResetSearch,
  onOpenRunInRetrieval,
  onOpenResultInRetrieval,
  searchMode = "recent",
  searchBusy = false
}: ImportHistoryPanelProps) {
  const [filters, setFilters] = useState<ImportHistoryFilters>({
    vendor: "",
    topic: "",
    text: "",
    from: "",
    to: "",
    status: "all"
  });

  function formatResultKindLabel(kind: string): string {
    switch (kind) {
      case "chatgpt_export":
        return "ChatGPT export";
      case "conversation_json":
        return "Conversation JSON";
      case "gemini_activity_html":
        return "Gemini My Activity export";
      case "json_document":
        return "JSON document";
      case "text_document":
        return "Text document";
      case "pdf_document":
        return "PDF document";
      case "unsupported":
        return "Unsupported file";
      default:
        return "Imported item";
    }
  }

  function formatResultStatusLabel(
    status: "imported" | "skipped" | "failed",
    metadata?: ImportFileMetadata
  ): string {
    if (status === "failed") {
      return "Failed";
    }

    if (status === "skipped") {
      return "Skipped";
    }

    if (metadata?.sourceCategory === "document" && metadata.parseStatus === "binary_archived_only") {
      return "Archived only";
    }

    return "Imported";
  }

  function formatSupportTierLabel(tier: ImportSupportTier): string {
    switch (tier) {
      case "mvp_first_class":
        return "Ready now";
      case "mvp_compatibility_fallback":
        return "Recovery path";
      case "experimental_expansion":
        return "Advanced import";
      default:
        return "Not supported";
    }
  }

  async function handleOpenPath(targetPath: string) {
    await revealDesktopPath(targetPath);
  }

  async function handleSearch() {
    await onSearch?.(filters);
  }

  async function handleResetSearch() {
    setFilters({
      vendor: "",
      topic: "",
      text: "",
      from: "",
      to: "",
      status: "all"
    });
    await onResetSearch?.();
  }

  function formatDateRange(startedAt?: string, endedAt?: string): string | null {
    if (!startedAt && !endedAt) return null;
    if (startedAt && endedAt) {
      return new Date(startedAt).toLocaleDateString() + " to " + new Date(endedAt).toLocaleDateString();
    }

    const single = startedAt ?? endedAt;
    return single ? new Date(single).toLocaleDateString() : null;
  }

  function renderSignalBadges(
    badges: Array<{ label: string; tone: "success" | "warning" | "neutral" }>
  ) {
    if (badges.length === 0) {
      return null;
    }

    return (
      <div className="signal-badge-row">
        {badges.map((badge) => (
          <span
            key={badge.label}
            className={
              badge.tone === "success"
                ? "signal-badge success"
                : badge.tone === "warning"
                  ? "signal-badge warning"
                  : "signal-badge"
            }
          >
            {badge.label}
          </span>
        ))}
      </div>
    );
  }

  function summarizeRunSignals(run: ImportRunSummary | null): Array<{ label: string; tone: "success" | "warning" | "neutral" }> {
    if (!run) {
      return [];
    }

    let extractedTextFiles = 0;
    let archiveOnlyFiles = 0;
    let preservedBlobFiles = 0;
    let missingBlobFiles = 0;
    let attachmentReferenceFiles = 0;
    let packageCompanionFiles = 0;

    for (const result of run.results) {
      const metadata = result.metadata;
      const normalizedMessage = result.message.toLowerCase();

      if (isPackageCompanionSkip(result)) {
        packageCompanionFiles += 1;
      }

      if (metadata?.sourceCategory === "document") {
        if (metadata.parseStatus === "text_extracted") {
          extractedTextFiles += 1;
        }

        if (metadata.parseStatus === "binary_archived_only") {
          archiveOnlyFiles += 1;
        }
      }

      if (metadata?.sourceCategory === "conversation" && metadata.attachmentCount > 0) {
        attachmentReferenceFiles += 1;
      }

      if (normalizedMessage.includes("attachment blob(s) preserved")) {
        preservedBlobFiles += 1;
      }

      if (normalizedMessage.includes("referenced blob(s) missing")) {
        missingBlobFiles += 1;
      }
    }

    const badges: Array<{ label: string; tone: "success" | "warning" | "neutral" }> = [];

    if (extractedTextFiles > 0) {
      badges.push({ label: extractedTextFiles + " extracted text", tone: "success" });
    }

    if (archiveOnlyFiles > 0) {
      badges.push({ label: archiveOnlyFiles + " archived only", tone: "warning" });
    }

    if (attachmentReferenceFiles > 0) {
      badges.push({ label: attachmentReferenceFiles + " file(s) with attachments", tone: "neutral" });
    }

    if (preservedBlobFiles > 0) {
      badges.push({ label: preservedBlobFiles + " blob-preserved", tone: "success" });
    }

    if (missingBlobFiles > 0) {
      badges.push({ label: missingBlobFiles + " blob-missing", tone: "warning" });
    }

    if (packageCompanionFiles > 0) {
      badges.push({ label: packageCompanionFiles + " package companions", tone: "success" });
    }

    return badges;
  }

  function summarizeRunSignalsCompact(run: ImportRunSummary): Array<{ label: string; tone: "success" | "warning" | "neutral" }> {
    const detailed = summarizeRunSignals(run);

    return detailed
      .map((badge) => {
        if (badge.label.includes("extracted text")) {
          return { label: "text extracted", tone: badge.tone } as const;
        }

        if (badge.label.includes("archived only")) {
          return { label: "archived only", tone: badge.tone } as const;
        }

        if (badge.label.includes("blob-preserved")) {
          return { label: "files preserved", tone: badge.tone } as const;
        }

        if (badge.label.includes("blob-missing")) {
          return { label: "missing files", tone: badge.tone } as const;
        }

        if (badge.label.includes("file(s) with attachments")) {
          return { label: "attachments", tone: badge.tone } as const;
        }

        return badge;
      })
      .filter((badge, index, badges) => badges.findIndex((item) => item.label === badge.label) === index)
      .slice(0, 3);
  }

  function renderOutcomeBadges(
    metadata: ImportFileMetadata | undefined,
    message: string,
    status: "imported" | "skipped" | "failed"
  ) {
    const badges: Array<{ label: string; tone: "success" | "warning" | "neutral" }> = [];
    const normalizedMessage = message.toLowerCase();

    if (status === "skipped" && normalizedMessage.includes("companion file for")) {
      badges.push({ label: "package companion", tone: "success" });
    }

    if (metadata?.sourceCategory === "conversation") {
      if (metadata.attachmentCount > 0) {
        badges.push({
          label: metadata.attachmentCount + " attachment ref(s)",
          tone: "neutral"
        });
      }

      if (normalizedMessage.includes("attachment blob(s) preserved")) {
        badges.push({ label: "blobs preserved", tone: "success" });
      }

      if (normalizedMessage.includes("referenced blob(s) missing")) {
        badges.push({ label: "missing blobs", tone: "warning" });
      }
    }

    if (metadata?.sourceCategory === "document") {
      if (metadata.parseStatus === "text_extracted") {
        badges.push({ label: "text extracted", tone: "success" });
      }

      if (metadata.parseStatus === "binary_archived_only") {
        badges.push({ label: "archived only", tone: "warning" });
      }
    }

    if (badges.length === 0) {
      return null;
    }

    return renderSignalBadges(badges);
  }

  function renderFileMetadata(metadata: ImportFileMetadata | undefined) {
    if (!metadata) return null;

    if (metadata.sourceCategory === "conversation") {
      const range = formatDateRange(metadata.startedAt, metadata.endedAt);
      return (
        <div className="muted">
          <div>
            {metadata.detectedLabel} | {metadata.conversationCount} conversation(s) | {metadata.messageCount} message(s)
          </div>
          <div>Support: {formatSupportTierLabel(metadata.supportTier)}</div>
          <div>Vendors: {metadata.vendorSources.join(", ")}</div>
          {range ? <div>Date range: {range}</div> : null}
          {metadata.topicHints.length > 0 ? <div>Topics: {metadata.topicHints.join(", ")}</div> : null}
        </div>
      );
    }

    return (
      <div className="muted">
        <div>
          {formatResultKindLabel(metadata.sourceKind)} | {metadata.fileExtension || "no extension"} | {Math.round(metadata.sizeBytes / 1024)} KB
        </div>
        <div>Support: {formatSupportTierLabel(metadata.supportTier)}</div>
        <div>
          {metadata.parseStatus === "text_extracted" ? "Text extracted" : "Archived without extracted text"} | {metadata.textLength} chars
        </div>
      </div>
    );
  }

  const normalizedVendor = filters.vendor.trim().toLowerCase();
  const normalizedTopic = filters.topic.trim().toLowerCase();
  const normalizedText = filters.text.trim().toLowerCase();
  const fromTime = filters.from ? Date.parse(filters.from) : NaN;
  const toTime = filters.to ? Date.parse(filters.to) : NaN;

  const filteredRuns = history
    ? history.runs.filter((run) => {
        if (normalizedVendor) {
          const vendors = run.retrievalSummary?.vendorSources ?? [];
          if (!vendors.some((vendor) => vendor.toLowerCase() === normalizedVendor)) {
            return false;
          }
        }

        if (normalizedTopic) {
          const topics = run.retrievalSummary?.topicHints ?? [];
          if (!topics.some((topic) => topic.toLowerCase().includes(normalizedTopic))) {
            return false;
          }
        }

        if (normalizedText) {
          const haystack = [
            run.inputPath,
            ...(run.retrievalSummary?.vendorSources ?? []),
            ...(run.retrievalSummary?.topicHints ?? []),
            ...run.results.map((result) => result.path),
            ...run.results.map((result) => result.message)
          ]
            .join(" ")
            .toLowerCase();

          if (!haystack.includes(normalizedText)) {
            return false;
          }
        }

        if (!Number.isNaN(fromTime) || !Number.isNaN(toTime)) {
          const startedAt = run.retrievalSummary?.startedAt ?? run.runAt;
          const endedAt = run.retrievalSummary?.endedAt ?? run.runAt;
          const startedTime = Date.parse(startedAt);
          const endedTime = Date.parse(endedAt);

          if (!Number.isNaN(fromTime) && endedTime < fromTime) {
            return false;
          }

          if (!Number.isNaN(toTime) && startedTime > toTime) {
            return false;
          }
        }

        if (filters.status !== "all") {
          if (!run.results.some((result) => result.status === filters.status)) {
            return false;
          }
        }

        return true;
      })
    : [];

  const filteredSelectedRun = filteredRuns.find((run) => run.runAt === selectedRun?.runAt) ?? null;
  const runForDetail = filteredSelectedRun ?? (filteredRuns.length === 1 ? filteredRuns[0] : null);
  const latestArchiveArtifactPath = findLatestArchiveArtifactPath(runForDetail);
  const latestDatasetArtifactPath = findLatestDatasetArtifactPath(runForDetail);
  const visibleResults = runForDetail
    ? runForDetail.results.filter((result) => {
        if (filters.status !== "all" && result.status !== filters.status) {
          return false;
        }

        if (normalizedText) {
          const haystack = [result.path, result.message, result.kind].join(" ").toLowerCase();
          if (!haystack.includes(normalizedText)) {
            return false;
          }
        }

        if (result.metadata?.sourceCategory === "conversation") {
          if (normalizedVendor && !result.metadata.vendorSources.some((vendor) => vendor.toLowerCase() === normalizedVendor)) {
            return false;
          }

          if (normalizedTopic && !result.metadata.topicHints.some((topic) => topic.toLowerCase().includes(normalizedTopic))) {
            return false;
          }

          if (!Number.isNaN(fromTime) || !Number.isNaN(toTime)) {
            const startedTime = result.metadata.startedAt ? Date.parse(result.metadata.startedAt) : NaN;
            const endedTime = result.metadata.endedAt ? Date.parse(result.metadata.endedAt) : startedTime;

            if (!Number.isNaN(fromTime) && !Number.isNaN(endedTime) && endedTime < fromTime) {
              return false;
            }

            if (!Number.isNaN(toTime) && !Number.isNaN(startedTime) && startedTime > toTime) {
              return false;
            }
          }
        } else if (normalizedVendor || normalizedTopic || !Number.isNaN(fromTime) || !Number.isNaN(toTime)) {
          return false;
        }

        return true;
      })
    : [];

  return (
    <div className="panel large">
      <div className="panel-heading-row">
        <h2>Import History</h2>
        {onRefresh ? (
          <button className="secondary-btn" type="button" onClick={onRefresh}>
            Refresh
          </button>
        ) : null}
      </div>

      <div className="history-filter-grid">
        <label className="form-label tight">
          Search
          <input
            className="text-input"
            type="text"
            value={filters.text}
            onChange={(event) => setFilters((current) => ({ ...current, text: event.target.value }))}
            placeholder="Path, topic, result"
          />
        </label>
        <label className="form-label tight">
          Vendor
          <input
            className="text-input"
            type="text"
            value={filters.vendor}
            onChange={(event) => setFilters((current) => ({ ...current, vendor: event.target.value }))}
            placeholder="claude, grok, chatgpt"
          />
        </label>
        <label className="form-label tight">
          Topic
          <input
            className="text-input"
            type="text"
            value={filters.topic}
            onChange={(event) => setFilters((current) => ({ ...current, topic: event.target.value }))}
            placeholder="crypto, support, roadmap"
          />
        </label>
        <label className="form-label tight">
          Status
          <select
            value={filters.status}
            onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as ImportHistoryFilters["status"] }))}
          >
            <option value="all">All</option>
            <option value="imported">Imported</option>
            <option value="skipped">Skipped</option>
            <option value="failed">Failed</option>
          </select>
        </label>
        <label className="form-label tight">
          From
          <input
            className="text-input"
            type="date"
            value={filters.from}
            onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))}
          />
        </label>
        <label className="form-label tight">
          To
          <input
            className="text-input"
            type="date"
            value={filters.to}
            onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))}
          />
        </label>
      </div>
      <div className="history-query-toolbar">
        <span className="muted">
          {searchMode === "query"
            ? "Showing matching results from your full import history."
            : "Showing recent runs with quick filtering."}
        </span>
        <div className="action-bar">
          {onSearch ? (
            <button className="primary-btn" type="button" onClick={handleSearch} disabled={searchBusy}>
              {searchBusy ? "Searching..." : "Search Full History"}
            </button>
          ) : null}
          {onResetSearch ? (
            <button className="secondary-btn" type="button" onClick={handleResetSearch} disabled={searchBusy || searchMode === "recent"}>
              Recent Runs
            </button>
          ) : null}
        </div>
      </div>

      {!history || history.runs.length === 0 ? (
        <p className="muted">No import history has been recorded for this output folder yet.</p>
      ) : filteredRuns.length === 0 ? (
        <p className="muted">No import runs match the current filters.</p>
      ) : (
        <div className="import-history-grid">
          <div>
            <ul className="list collection-list">
              {filteredRuns.map((run) => {
                const key = run.historyPath || run.runAt;
                const selected = runForDetail?.runAt === run.runAt;
                return (
                  <li
                    key={key}
                    className={selected ? "collection-item selected-row" : "collection-item"}
                    onClick={() => onSelectRun(run)}
                  >
                    <div><strong>{new Date(run.runAt).toLocaleString()}</strong></div>
                    <div className="muted">
                      {summarizeRunOutcomeCounts(run)}
                    </div>
                    {renderSignalBadges(summarizeRunSignalsCompact(run))}
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            {runForDetail ? (
              <>
                <div className="detail-box">
                  <strong>Run Summary</strong>
                  <p className="muted">Imported from: {runForDetail.inputPath}</p>
                  <p className="muted">Saved to: {runForDetail.outputRoot}</p>
                  <p className="muted">
                    Imported {runForDetail.filesImported} of {runForDetail.filesDiscovered} file(s) | {summarizeRunOutcomeCounts(runForDetail)}
                  </p>
                  {renderSignalBadges(summarizeRunSignals(runForDetail))}
                  <p className="muted">
                    Conversation imports: {runForDetail.conversationFilesProcessed} | Document imports: {runForDetail.genericDocumentsProcessed} | PDF imports: {runForDetail.pdfFilesArchived}
                  </p>
                  {runForDetail.retrievalSummary ? (
                    <>
                      <p className="muted">
                        Sources: {runForDetail.retrievalSummary.vendorSources.join(", ")} | {runForDetail.retrievalSummary.conversationCount} conversation(s) | {runForDetail.retrievalSummary.messageCount} message(s)
                      </p>
                      {runForDetail.retrievalSummary.attachmentCount > 0 ? (
                        <p className="muted">
                          {runForDetail.retrievalSummary.attachmentCount} attachment reference(s) across imported conversations. Check individual file results below for preservation status.
                        </p>
                      ) : null}
                      <p className="muted">
                        Readiness: {runForDetail.retrievalSummary.supportTiers.map(formatSupportTierLabel).join(", ")}
                      </p>
                      {formatDateRange(runForDetail.retrievalSummary.startedAt, runForDetail.retrievalSummary.endedAt) ? (
                        <p className="muted">
                          Conversation date range: {formatDateRange(runForDetail.retrievalSummary.startedAt, runForDetail.retrievalSummary.endedAt)}
                        </p>
                      ) : null}
                      {runForDetail.retrievalSummary.topicHints.length > 0 ? (
                        <p className="muted">
                          Topic hints: {runForDetail.retrievalSummary.topicHints.join(", ")}
                        </p>
                      ) : null}
                      {countPackageCompanionSkips(runForDetail) > 0 ? (
                        <p className="muted">
                          Vendor package handling: {countPackageCompanionSkips(runForDetail)} companion file(s) were expected and were kept out of the dataset flow by routing the package through its main import file.
                        </p>
                      ) : null}
                    </>
                  ) : null}
                  <div className="action-bar">
                    {onOpenRunInRetrieval && runForDetail.retrievalSummary ? (
                      <button
                        className="primary-btn"
                        type="button"
                        onClick={() => onOpenRunInRetrieval(runForDetail, filters)}
                      >
                        Open In Search
                      </button>
                    ) : null}
                    {latestArchiveArtifactPath ? (
                      <button
                        className="primary-btn"
                        type="button"
                        onClick={() => handleOpenPath(latestArchiveArtifactPath)}
                      >
                        Open Latest Archive File
                      </button>
                    ) : null}
                    {latestDatasetArtifactPath ? (
                      <button
                        className="secondary-btn"
                        type="button"
                        onClick={() => handleOpenPath(latestDatasetArtifactPath)}
                      >
                        Open Latest Dataset File
                      </button>
                    ) : null}
                    {runForDetail.artifacts.length > 0 ? (
                      <>
                      {runForDetail.artifacts.slice(0, 6).map((artifact) => (
                        <button
                          key={artifact.label + artifact.path}
                          className="primary-btn"
                          type="button"
                          onClick={() => handleOpenPath(artifact.path)}
                        >
                          Open {artifact.label}
                        </button>
                      ))}
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="table-wrap">
                  <table className="review-table">
                    <thead>
                      <tr>
                        <th>Status</th>
                        <th>Type</th>
                        <th>Path</th>
                        <th>Message</th>
                        <th>Outputs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleResults.map((result) => (
                      <tr key={result.path + result.kind}>
                          <td>{formatResultStatusLabel(result.status, result.metadata)}</td>
                          <td>
                            {result.metadata?.sourceCategory === "conversation"
                              ? result.metadata.detectedLabel
                              : formatResultKindLabel(result.kind)}
                          </td>
                          <td>
                            <div>{result.path}</div>
                            {renderOutcomeBadges(result.metadata, result.message, result.status)}
                            {renderFileMetadata(result.metadata)}
                          </td>
                          <td>{result.message}</td>
                          <td>
                            {(result.metadata?.sourceCategory === "conversation" && onOpenResultInRetrieval) ||
                            (result.artifacts && result.artifacts.length > 0) ? (
                              <div className="inline-action-list">
                                {result.metadata?.sourceCategory === "conversation" && onOpenResultInRetrieval ? (
                                  <button
                                    className="primary-btn compact-btn"
                                    type="button"
                                    onClick={() => onOpenResultInRetrieval(runForDetail, result.path, filters)}
                                  >
                                    Search
                                  </button>
                                ) : null}
                                {(result.artifacts ?? []).map((artifact) => (
                                  <button
                                    key={artifact.label + artifact.path}
                                    className="secondary-btn compact-btn"
                                    type="button"
                                    onClick={() => handleOpenPath(artifact.path)}
                                  >
                                    {artifact.label}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <span className="muted">No direct outputs listed</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="muted">Select a matching import run to inspect file-level results.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
