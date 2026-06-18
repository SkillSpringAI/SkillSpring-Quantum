import { useEffect, useState } from "react";
import { loadImportRetrievalIndex } from "../services/importRetrievalIndexBridge";
import { revealDesktopPath } from "../services/pathBridge";
import { rankRetrievalEntries } from "../services/retrievalRanking";
import {
  loadRetrievalSavedViews,
  removeRetrievalSavedView,
  storeRetrievalSavedView
} from "../services/retrievalSavedViewsBridge";
import { loadSegmentRetrievalIndex } from "../services/segmentRetrievalIndexBridge";
import { rankSegmentEntries } from "../services/segmentRetrievalRanking";
import type {
  ImportRetrievalIndexEntry,
  ImportRetrievalIndexResult
} from "../types/importRetrievalIndex";
import type {
  RetrievalSavedRecordSelection,
  RetrievalSavedSegmentSelection,
  RetrievalSavedViewFilters,
  RetrievalSavedViewsResult
} from "../types/retrievalSavedViews";
import type {
  SegmentRetrievalIndexEntry,
  SegmentRetrievalIndexResult
} from "../types/segmentRetrievalIndex";
import { useNavigation } from "../state/navigationContext";

type RetrievalFilters = RetrievalSavedViewFilters;

const OUTPUT_ROOT = "organized_output";

function formatEntryKindLabel(kind: string): string {
  switch (kind) {
    case "chatgpt_export":
      return "ChatGPT export";
    case "conversation_json":
      return "Conversation JSON";
    case "json_document":
      return "JSON document";
    case "text_document":
      return "Text document";
    case "pdf_document":
      return "PDF document";
    default:
      return "Indexed record";
  }
}

export default function RetrievalScreen() {
  const { retrievalIntent, clearRetrievalIntent } = useNavigation();
  const [indexResult, setIndexResult] = useState<ImportRetrievalIndexResult | null>(null);
  const [segmentIndexResult, setSegmentIndexResult] = useState<SegmentRetrievalIndexResult | null>(null);
  const [savedViewsResult, setSavedViewsResult] = useState<RetrievalSavedViewsResult | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<ImportRetrievalIndexEntry | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<SegmentRetrievalIndexEntry | null>(null);
  const [savedViewName, setSavedViewName] = useState("");
  const [filters, setFilters] = useState<RetrievalFilters>({
    text: "",
    vendor: "",
    topic: "",
    status: "all",
    from: "",
    to: ""
  });

  async function refreshIndex() {
    const [result, segmentResult, viewsResult] = await Promise.all([
      loadImportRetrievalIndex(OUTPUT_ROOT),
      loadSegmentRetrievalIndex(OUTPUT_ROOT),
      loadRetrievalSavedViews(OUTPUT_ROOT)
    ]);

    setIndexResult(result);
    setSegmentIndexResult(segmentResult);
    setSavedViewsResult(viewsResult);

    setSelectedEntry((current) => {
      if (!result.latest) return null;
      if (!current) return result.latest.entries[0] ?? null;
      return result.latest.entries.find((entry) => entry.filePath === current.filePath && entry.runAt === current.runAt)
        ?? result.latest.entries[0]
        ?? null;
    });

    setSelectedSegment((current) => {
      if (!segmentResult.latest) return null;
      if (!current) return segmentResult.latest.entries[0] ?? null;
      return segmentResult.latest.entries.find((entry) =>
        entry.runId === current.runId &&
        entry.conversationId === current.conversationId &&
        entry.startIndex === current.startIndex &&
        entry.endIndex === current.endIndex
      ) ?? segmentResult.latest.entries[0] ?? null;
    });
  }

  async function handleSaveCurrentView() {
    const normalizedName = savedViewName.trim();
    if (!normalizedName) return;
    const next = await storeRetrievalSavedView(
      OUTPUT_ROOT,
      normalizedName,
      filters,
      selectedEntry
        ? {
            runAt: selectedEntry.runAt,
            filePath: selectedEntry.filePath
          }
        : undefined,
      toSavedSegmentSelection(selectedSegment)
    );
    setSavedViewsResult(next);
    setSavedViewName("");
  }

  async function handleDeleteSavedView(id: string) {
    const next = await removeRetrievalSavedView(OUTPUT_ROOT, id);
    setSavedViewsResult(next);
  }

  function clearFilters() {
    setFilters({
      text: "",
      vendor: "",
      topic: "",
      status: "all",
      from: "",
      to: ""
    });
  }

  function applySavedView(
    nextFilters: RetrievalFilters,
    nextRecord?: RetrievalSavedRecordSelection,
    nextSegment?: RetrievalSavedSegmentSelection
  ) {
    setFilters({ ...nextFilters });
    setSelectedEntry(
      nextRecord
        ? entries.find((entry) => entry.runAt === nextRecord.runAt && entry.filePath === nextRecord.filePath) ?? null
        : null
    );
    setSelectedSegment(
      nextSegment
        ? segmentEntries.find((entry) =>
            entry.runId === nextSegment.runId &&
            entry.conversationId === nextSegment.conversationId &&
            entry.startIndex === nextSegment.startIndex &&
            entry.endIndex === nextSegment.endIndex
          ) ?? null
        : null
    );
  }

  useEffect(() => {
    refreshIndex();
  }, []);

  useEffect(() => {
    if (!retrievalIntent || !indexResult?.latest) {
      return;
    }

    setFilters({ ...retrievalIntent.filters });
    setSavedViewName(retrievalIntent.suggestedName ?? "");
    setSelectedEntry(
      retrievalIntent.selectedRecord
        ? indexResult.latest.entries.find((entry) =>
            entry.runAt === retrievalIntent.selectedRecord?.runAt &&
            entry.filePath === retrievalIntent.selectedRecord?.filePath
          ) ?? null
        : null
    );
    setSelectedSegment(null);
    clearRetrievalIntent();
  }, [retrievalIntent, indexResult, clearRetrievalIntent]);

  const entries = indexResult?.latest?.entries ?? [];
  const segmentEntries = segmentIndexResult?.latest?.entries ?? [];
  const normalizedText = filters.text.trim().toLowerCase();
  const normalizedVendor = filters.vendor.trim().toLowerCase();
  const normalizedTopic = filters.topic.trim().toLowerCase();
  const fromTime = filters.from ? Date.parse(filters.from) : NaN;
  const toTime = filters.to ? Date.parse(filters.to) : NaN;

  const filteredEntries = entries.filter((entry) => {
    if (filters.status !== "all" && entry.status !== filters.status) {
      return false;
    }

    if (normalizedVendor && !entry.vendorSources.some((value) => value.toLowerCase() === normalizedVendor)) {
      return false;
    }

    if (normalizedTopic && !entry.topicHints.some((value) => value.toLowerCase().includes(normalizedTopic))) {
      return false;
    }

    if (normalizedText && !entry.searchText.includes(normalizedText)) {
      return false;
    }

    if (!Number.isNaN(fromTime) || !Number.isNaN(toTime)) {
      const startedTime = entry.startedAt ? Date.parse(entry.startedAt) : NaN;
      const endedTime = entry.endedAt ? Date.parse(entry.endedAt) : startedTime;

      if (!Number.isNaN(fromTime) && !Number.isNaN(endedTime) && endedTime < fromTime) {
        return false;
      }

      if (!Number.isNaN(toTime) && !Number.isNaN(startedTime) && startedTime > toTime) {
        return false;
      }
    }

    return true;
  });

  const rankedEntries = rankRetrievalEntries(filteredEntries, {
    text: filters.text,
    vendor: filters.vendor,
    topic: filters.topic
  });
  const visibleEntries = rankedEntries.map((item) => item.entry);
  const rankingMap = new Map(
    rankedEntries.map((item) => [item.entry.runAt + "|" + item.entry.filePath, item])
  );

  const detailEntry = visibleEntries.find((entry) =>
    entry.filePath === selectedEntry?.filePath &&
    entry.runAt === selectedEntry?.runAt
  ) ?? visibleEntries[0] ?? null;

  const filteredSegmentEntries = segmentEntries.filter((entry) => {
    if (normalizedVendor && entry.source.toLowerCase() !== normalizedVendor) {
      return false;
    }

    if (normalizedTopic) {
      const topicMatch =
        entry.topic.toLowerCase().includes(normalizedTopic) ||
        entry.rawTopic.toLowerCase().includes(normalizedTopic);
      if (!topicMatch) {
        return false;
      }
    }

    if (normalizedText && !entry.searchText.includes(normalizedText)) {
      return false;
    }

    if (!Number.isNaN(fromTime) || !Number.isNaN(toTime)) {
      const createdTime = entry.createdAt ? Date.parse(entry.createdAt) : NaN;
      if (!Number.isNaN(fromTime) && !Number.isNaN(createdTime) && createdTime < fromTime) {
        return false;
      }
      if (!Number.isNaN(toTime) && !Number.isNaN(createdTime) && createdTime > toTime) {
        return false;
      }
    }

    return true;
  });

  const rankedSegments = rankSegmentEntries(filteredSegmentEntries, {
    text: filters.text,
    vendor: filters.vendor,
    topic: filters.topic
  });
  const visibleSegments = rankedSegments.map((item) => item.entry);
  const segmentRankingMap = new Map(
    rankedSegments.map((item) => [
      item.entry.runId + "|" + item.entry.conversationId + "|" + item.entry.startIndex + "|" + item.entry.endIndex,
      item
    ])
  );

  const linkedSegments = detailEntry
    ? visibleSegments.filter((entry) => detailEntry.conversationIds.includes(entry.conversationId))
    : [];

  const detailSegment = (
    linkedSegments.find((entry) =>
      entry.runId === selectedSegment?.runId &&
      entry.conversationId === selectedSegment?.conversationId &&
      entry.startIndex === selectedSegment?.startIndex &&
      entry.endIndex === selectedSegment?.endIndex
    ) ??
    visibleSegments.find((entry) =>
      entry.runId === selectedSegment?.runId &&
      entry.conversationId === selectedSegment?.conversationId &&
      entry.startIndex === selectedSegment?.startIndex &&
      entry.endIndex === selectedSegment?.endIndex
    ) ??
    linkedSegments[0] ??
    visibleSegments[0] ??
    null
  );

  const vendorsVisible = [...new Set(visibleEntries.flatMap((entry) => entry.vendorSources))].sort();
  const topicsVisible = [...new Set(visibleEntries.flatMap((entry) => entry.topicHints))].sort();
  const conversationEntries = visibleEntries.filter((entry) => entry.sourceCategory === "conversation");
  const totalMessages = conversationEntries.reduce((sum, entry) => sum + (entry.messageCount ?? 0), 0);
  const activeFilterCount = [
    filters.text.trim(),
    filters.vendor.trim(),
    filters.topic.trim(),
    filters.status !== "all" ? filters.status : "",
    filters.from,
    filters.to
  ].filter(Boolean).length;

  function formatDateRange(startedAt?: string, endedAt?: string): string | null {
    if (!startedAt && !endedAt) return null;
    if (startedAt && endedAt) {
      return new Date(startedAt).toLocaleDateString() + " to " + new Date(endedAt).toLocaleDateString();
    }

    const single = startedAt ?? endedAt;
    return single ? new Date(single).toLocaleDateString() : null;
  }

  function segmentKey(entry: SegmentRetrievalIndexEntry): string {
    return entry.runId + "|" + entry.conversationId + "|" + entry.startIndex + "|" + entry.endIndex;
  }

  function toSavedSegmentSelection(
    entry: SegmentRetrievalIndexEntry | null
  ): RetrievalSavedSegmentSelection | undefined {
    if (!entry) return undefined;
    return {
      runId: entry.runId,
      conversationId: entry.conversationId,
      startIndex: entry.startIndex,
      endIndex: entry.endIndex
    };
  }

  return (
    <section className="screen-grid retrieval-layout">
      <div className="panel large">
        <div className="panel-heading-row">
          <h2>Retrieval</h2>
          <button className="secondary-btn" type="button" onClick={refreshIndex}>
            Refresh
          </button>
        </div>

        {!indexResult?.latest ? (
          <p className="muted">
            No retrieval index found yet. Run an import first so Quantum can build a compact search-ready view.
          </p>
        ) : (
          <>
            <div className="history-filter-grid">
              <label className="form-label tight">
                Search
                <input
                  className="text-input"
                  type="text"
                  value={filters.text}
                  onChange={(event) => setFilters((current) => ({ ...current, text: event.target.value }))}
                  placeholder="crypto, roadmap, exported file path"
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
                  placeholder="crypto, support, ai safety"
                />
              </label>
              <label className="form-label tight">
                Status
                <select
                  value={filters.status}
                  onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as RetrievalFilters["status"] }))}
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

            <div className="retrieval-filter-toolbar">
              <span className="muted">
                {activeFilterCount > 0 ? `${activeFilterCount} active filters` : "No active filters"}
              </span>
              <button className="secondary-btn chip-btn" type="button" onClick={clearFilters}>
                Clear Filters
              </button>
            </div>

            {vendorsVisible.length > 0 ? (
              <div className="chip-group">
                {vendorsVisible.map((vendor) => {
                  const active = normalizedVendor === vendor.toLowerCase();
                  return (
                    <button
                      key={vendor}
                      className={active ? "chip-btn active" : "chip-btn"}
                      type="button"
                      onClick={() =>
                        setFilters((current) => ({
                          ...current,
                          vendor: active ? "" : vendor
                        }))
                      }
                    >
                      {vendor}
                    </button>
                  );
                })}
              </div>
            ) : null}

            {topicsVisible.length > 0 ? (
              <div className="chip-group">
                {topicsVisible.slice(0, 12).map((topic) => {
                  const active = normalizedTopic === topic.toLowerCase();
                  return (
                    <button
                      key={topic}
                      className={active ? "chip-btn active" : "chip-btn"}
                      type="button"
                      onClick={() =>
                        setFilters((current) => ({
                          ...current,
                          topic: active ? "" : topic
                        }))
                      }
                    >
                      {topic}
                    </button>
                  );
                })}
              </div>
            ) : null}

            <div className="stats-grid two-col">
              <div className="stat-card">
                <span className="label">Matched Records</span>
                <strong>{visibleEntries.length}</strong>
              </div>
              <div className="stat-card">
                <span className="label">Conversation Records</span>
                <strong>{conversationEntries.length}</strong>
              </div>
              <div className="stat-card">
                <span className="label">Visible Vendors</span>
                <strong>{vendorsVisible.length}</strong>
              </div>
              <div className="stat-card">
                <span className="label">Messages Indexed</span>
                <strong>{totalMessages}</strong>
              </div>
              <div className="stat-card">
                <span className="label">Matched Segments</span>
                <strong>{visibleSegments.length}</strong>
              </div>
              <div className="stat-card">
                <span className="label">Linked Segments</span>
                <strong>{linkedSegments.length}</strong>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="panel">
        <div className="panel-heading-row">
          <h2>Saved Views</h2>
          {savedViewsResult?.latest ? (
            <button
              className="secondary-btn"
              type="button"
              onClick={() => revealDesktopPath(savedViewsResult.latestFile)}
            >
              Open File
            </button>
          ) : null}
        </div>
        <label className="form-label tight">
          View name
          <input
            className="text-input"
            type="text"
            value={savedViewName}
            onChange={(event) => setSavedViewName(event.target.value)}
            placeholder="Crypto Feb-May 2026"
          />
        </label>
        <div className="action-bar">
          <button className="primary-btn" type="button" onClick={handleSaveCurrentView} disabled={!savedViewName.trim()}>
            Save Current Investigation
          </button>
        </div>
        {!savedViewsResult?.latest?.views.length ? (
          <p className="muted">No saved views yet. Save a named search once the filters look useful.</p>
        ) : (
          <ul className="list collection-list retrieval-list">
            {savedViewsResult.latest.views.map((view) => (
              <li key={view.id} className="collection-item">
                <div><strong>{view.name}</strong></div>
                <div className="muted">
                  {view.filters.vendor || "all vendors"} | {view.filters.topic || "all topics"} | {view.filters.status}
                </div>
                <div className="muted">{view.filters.from || "any time"} to {view.filters.to || "now"}</div>
                <div className="muted">
                  {view.selectedRecord ? "Pinned record saved" : "No pinned record"} | {view.selectedSegment ? "Pinned segment saved" : "No pinned segment"}
                </div>
                <div className="action-bar">
                  <button
                    className="secondary-btn"
                    type="button"
                    onClick={() => applySavedView(view.filters, view.selectedRecord, view.selectedSegment)}
                  >
                    Apply
                  </button>
                  <button className="secondary-btn" type="button" onClick={() => handleDeleteSavedView(view.id)}>
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="panel">
        <h2>Filter Signals</h2>
        {!indexResult?.latest ? (
          <p className="muted">Filter suggestions appear once the retrieval index exists.</p>
        ) : (
          <>
            <p className="muted">Vendors: {vendorsVisible.join(", ") || "none visible"}</p>
            <p className="muted">Topics: {topicsVisible.slice(0, 8).join(", ") || "none visible"}</p>
            <p className="muted">Quick tip: click a vendor or topic chip above to narrow instantly.</p>
            <p className="muted">Index generated: {new Date(indexResult.latest.generatedAt).toLocaleString()}</p>
          </>
        )}
      </div>

      <div className="panel">
        <h2>What This Enables</h2>
        <ul className="list">
          <li>Quick narrowing by vendor and date before deeper semantic retrieval exists.</li>
          <li>Traceable links back to original import files and generated artifacts.</li>
          <li>A compact index artifact that future search can query directly.</li>
          <li>Deterministic linking from a matched file result to its related conversation segments.</li>
        </ul>
      </div>

      <div className="panel large">
        {!indexResult?.latest ? null : visibleEntries.length === 0 ? (
          <p className="muted">No indexed records match the current retrieval filters.</p>
        ) : (
          <div className="import-history-grid">
            <div>
              <ul className="list collection-list retrieval-list">
                {visibleEntries.map((entry) => {
                  const selected = detailEntry?.filePath === entry.filePath && detailEntry?.runAt === entry.runAt;
                  const ranked = rankingMap.get(entry.runAt + "|" + entry.filePath);
                  return (
                    <li
                      key={entry.runAt + "|" + entry.filePath}
                      className={selected ? "collection-item selected-row" : "collection-item"}
                      onClick={() => setSelectedEntry(entry)}
                    >
                      <div><strong>{entry.vendorSources.join(", ") || formatEntryKindLabel(entry.kind)}</strong></div>
                      <div className="muted">Score: {ranked?.score ?? 0}</div>
                      <div className="muted">{entry.topicHints.slice(0, 3).join(", ") || entry.status}</div>
                      <div className="muted">{formatDateRange(entry.startedAt, entry.endedAt) || new Date(entry.runAt).toLocaleDateString()}</div>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div>
              {detailEntry ? (
                <>
                  <div className="detail-box">
                    <strong>Indexed Record</strong>
                    <p className="muted">
                      Relevance score: {rankingMap.get(detailEntry.runAt + "|" + detailEntry.filePath)?.score ?? 0}
                    </p>
                    {rankingMap.get(detailEntry.runAt + "|" + detailEntry.filePath)?.reasons.length ? (
                      <p className="muted">
                        Ranked for: {rankingMap.get(detailEntry.runAt + "|" + detailEntry.filePath)?.reasons.join(", ")}
                      </p>
                    ) : null}
                    <p className="muted">File: {detailEntry.filePath}</p>
                    <p className="muted">Imported from: {detailEntry.inputPath}</p>
                    <p className="muted">Status: {detailEntry.status}</p>
                    <p className="muted">Vendor: {detailEntry.vendorSources.join(", ") || "document/generic"}</p>
                    {detailEntry.titleHints.length > 0 ? (
                      <p className="muted">Titles: {detailEntry.titleHints.join(", ")}</p>
                    ) : null}
                    {formatDateRange(detailEntry.startedAt, detailEntry.endedAt) ? (
                      <p className="muted">Conversation date range: {formatDateRange(detailEntry.startedAt, detailEntry.endedAt)}</p>
                    ) : null}
                    {detailEntry.topicHints.length > 0 ? (
                      <p className="muted">Topic hints: {detailEntry.topicHints.join(", ")}</p>
                    ) : null}
                    {typeof detailEntry.messageCount === "number" ? (
                      <p className="muted">
                        Conversations: {detailEntry.conversationCount ?? 0} | Messages: {detailEntry.messageCount} | Attachments: {detailEntry.attachmentCount ?? 0}
                      </p>
                    ) : null}
                    <p className="muted">Linked conversation IDs: {detailEntry.conversationIds.length}</p>
                    <p className="muted">{detailEntry.message}</p>
                    <div className="action-bar">
                      <button
                        className="secondary-btn"
                        type="button"
                        onClick={() => setSavedViewName(detailEntry.titleHints[0] || detailEntry.topicHints[0] || "Saved investigation")}
                      >
                        Use For Saved View Name
                      </button>
                      <button className="primary-btn" type="button" onClick={() => revealDesktopPath(detailEntry.filePath)}>
                        Open Source File
                      </button>
                      {detailEntry.artifactPaths.slice(0, 4).map((artifactPath) => (
                        <button
                          key={artifactPath}
                          className="secondary-btn"
                          type="button"
                          onClick={() => revealDesktopPath(artifactPath)}
                        >
                          Open Artifact
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="table-wrap">
                    <table className="review-table">
                      <thead>
                        <tr>
                          <th>Field</th>
                          <th>Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Run time</td>
                          <td>{new Date(detailEntry.runAt).toLocaleString()}</td>
                        </tr>
                        <tr>
                          <td>Kind</td>
                          <td>{formatEntryKindLabel(detailEntry.kind)}</td>
                        </tr>
                        <tr>
                          <td>Source category</td>
                          <td>{detailEntry.sourceCategory ?? "unknown"}</td>
                        </tr>
                        <tr>
                          <td>Topic hints</td>
                          <td>{detailEntry.topicHints.join(", ") || "none"}</td>
                        </tr>
                        <tr>
                          <td>Linked segments</td>
                          <td>{linkedSegments.length}</td>
                        </tr>
                        <tr>
                          <td>Artifacts</td>
                          <td>{detailEntry.artifactPaths.length}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <p className="muted">Select an indexed record to inspect it.</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="panel large">
        <div className="panel-heading-row">
          <h2>{linkedSegments.length > 0 ? "Related Segments For Selected Record" : "Matching Segments"}</h2>
          {segmentIndexResult?.latest ? (
            <button className="secondary-btn" type="button" onClick={() => revealDesktopPath(segmentIndexResult.latestFile)}>
              Open Segment Index
            </button>
          ) : null}
        </div>
        {!segmentIndexResult?.latest ? (
          <p className="muted">
            No segment retrieval index found yet. Run an import that produces dataset segments first.
          </p>
        ) : visibleSegments.length === 0 ? (
          <p className="muted">No segment-level matches for the current retrieval filters.</p>
        ) : (
          <div className="import-history-grid">
            <div>
              <ul className="list collection-list retrieval-list">
                {(linkedSegments.length > 0 ? linkedSegments : visibleSegments).slice(0, 40).map((entry) => {
                  const selected =
                    detailSegment?.runId === entry.runId &&
                    detailSegment?.conversationId === entry.conversationId &&
                    detailSegment?.startIndex === entry.startIndex &&
                    detailSegment?.endIndex === entry.endIndex;
                  const ranked = segmentRankingMap.get(segmentKey(entry));
                  return (
                    <li
                      key={segmentKey(entry)}
                      className={selected ? "collection-item selected-row" : "collection-item"}
                      onClick={() => setSelectedSegment(entry)}
                    >
                      <div><strong>{entry.topic}</strong></div>
                      <div className="muted">Score: {ranked?.score ?? 0} | {entry.source}</div>
                      <div className="muted">{entry.textPreview.slice(0, 120)}</div>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div>
              {detailSegment ? (
                <>
                  <div className="detail-box">
                    <strong>Segment Match</strong>
                    <p className="muted">
                      Relevance score: {segmentRankingMap.get(segmentKey(detailSegment))?.score ?? 0}
                    </p>
                    {segmentRankingMap.get(segmentKey(detailSegment))?.reasons.length ? (
                      <p className="muted">
                        Ranked for: {segmentRankingMap.get(segmentKey(detailSegment))?.reasons.join(", ")}
                      </p>
                    ) : null}
                    <p className="muted">Topic: {detailSegment.topic}</p>
                    <p className="muted">Source: {detailSegment.source}</p>
                    <p className="muted">Conversation ID: {detailSegment.conversationId}</p>
                    {detailSegment.title ? <p className="muted">Title: {detailSegment.title}</p> : null}
                    <p className="muted">
                      Span: {detailSegment.startIndex} to {detailSegment.endIndex} | Messages: {detailSegment.messageCount}
                    </p>
                    <p className="muted">
                      Signal: {detailSegment.signalTier} ({detailSegment.signalScore}) | Redactions: {detailSegment.redactionCount}
                    </p>
                    {detailSegment.createdAt ? (
                      <p className="muted">Created: {new Date(detailSegment.createdAt).toLocaleString()}</p>
                    ) : null}
                  </div>

                  <div className="record-block">{detailSegment.text}</div>
                </>
              ) : (
                <p className="muted">Select a segment match to inspect it.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
