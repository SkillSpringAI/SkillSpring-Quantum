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
import { useSettings } from "../state/settingsContext";

type RetrievalFilters = RetrievalSavedViewFilters;

function formatEntryKindLabel(kind: string): string {
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
    default:
      return "Imported file";
  }
}

export default function RetrievalScreen() {
  const { retrievalIntent, clearRetrievalIntent, setActiveScreen } = useNavigation();
  const { settings } = useSettings();
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showSavedSearches, setShowSavedSearches] = useState(false);
  const [showSearchTips, setShowSearchTips] = useState(false);
  const [showImportDetails, setShowImportDetails] = useState(false);
  const [showSegmentReview, setShowSegmentReview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
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
    setLoading(true);
    setLoadError(null);

    try {
      const [result, segmentResult, viewsResult] = await Promise.all([
        loadImportRetrievalIndex(settings.outputRoot),
        loadSegmentRetrievalIndex(settings.outputRoot),
        loadRetrievalSavedViews(settings.outputRoot)
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
    } catch (error) {
      const message = error instanceof Error ? error.message : "Quantum could not load this output root yet.";
      setLoadError(message);
      setIndexResult(null);
      setSegmentIndexResult(null);
      setSavedViewsResult(null);
      setSelectedEntry(null);
      setSelectedSegment(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveCurrentView() {
    const normalizedName = savedViewName.trim();
    if (!normalizedName) return;
    const next = await storeRetrievalSavedView(
      settings.outputRoot,
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
    const next = await removeRetrievalSavedView(settings.outputRoot, id);
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
  }, [settings.outputRoot]);

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
        (entry.summaryLabel ?? "").toLowerCase().includes(normalizedTopic) ||
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
  const totalConversations = conversationEntries.reduce((sum, entry) => sum + (entry.conversationCount ?? entry.conversationIds.length ?? 0), 0);
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
          <h2>Find Imports</h2>
          <button className="secondary-btn" type="button" onClick={refreshIndex} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {loading ? (
          <>
            <p className="muted">
              Loading searchable imports, saved searches, and conversation segments for this output folder.
            </p>
            <p className="muted">
              Quantum is reading the local indexes before this screen decides whether imports are available.
            </p>
            <p className="muted">
              Current output root: {describeOutputRoot(settings.outputRoot)}
            </p>
          </>
        ) : loadError ? (
          <>
            <p className="muted">
              Quantum could not finish loading Find Imports for this output root.
            </p>
            <p className="muted">
              Current output root: {describeOutputRoot(settings.outputRoot)}
            </p>
            <p className="muted">{loadError}</p>
            <div className="action-bar">
              <button className="secondary-btn" type="button" onClick={refreshIndex}>
                Try Refresh Again
              </button>
              <button className="primary-btn" type="button" onClick={() => setActiveScreen("imports")}>
                Go To Imports
              </button>
            </div>
          </>
        ) : !indexResult?.latest ? (
          <>
            <p className="muted">
              No searchable imports are available yet. Start in Imports, run an import, then come back here to find past files by vendor, topic, or date.
            </p>
            <p className="muted">
              Current output root: {describeOutputRoot(settings.outputRoot)}
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
              Search imported conversations and files here. Start simple, then open filters only when you need to narrow by status or date.
            </p>
            <p className="muted">
              Current output root: {describeOutputRoot(settings.outputRoot)}
            </p>
            <div className="stats-grid two-col">
              <div className="stat-card">
                <span className="label">Searchable Imports</span>
                <strong>{visibleEntries.length}</strong>
              </div>
              <div className="stat-card">
                <span className="label">Conversation Records</span>
                <strong>{totalConversations}</strong>
              </div>
              <div className="stat-card">
                <span className="label">Messages Indexed</span>
                <strong>{totalMessages}</strong>
              </div>
              <div className="stat-card">
                <span className="label">Visible Vendors</span>
                <strong>{vendorsVisible.length}</strong>
              </div>
            </div>
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
            </div>

            <div className="retrieval-filter-toolbar">
              <span className="muted">
                {activeFilterCount > 0 ? `${activeFilterCount} active filters` : "No active filters"}
              </span>
              <div className="action-bar">
                <button
                  className="secondary-btn chip-btn"
                  type="button"
                  onClick={() => setShowAdvancedFilters((current) => !current)}
                >
                  {showAdvancedFilters ? "Hide Advanced Filters" : "Show Advanced Filters"}
                </button>
                <button className="secondary-btn chip-btn" type="button" onClick={clearFilters}>
                  Clear Filters
                </button>
              </div>
            </div>
            {showAdvancedFilters ? (
              <div className="history-filter-grid">
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
            ) : null}

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
            <p className="muted">
              Search records can be smaller review slices, so they are not always one-to-one with whole chats.
            </p>
          </>
        )}
      </div>

      <div className="panel">
        <div className="panel-heading-row">
          <h2>Saved Searches</h2>
          {savedViewsResult?.latest ? (
            <button
              className="secondary-btn"
              type="button"
              onClick={() => revealDesktopPath(savedViewsResult.latestFile)}
            >
              Open Saved Searches File
            </button>
          ) : null}
        </div>
        <label className="form-label tight">
          Search name
          <input
            className="text-input"
            type="text"
            value={savedViewName}
            onChange={(event) => setSavedViewName(event.target.value)}
            placeholder="Gemini support imports"
          />
        </label>
        <p className="muted">
          Optional. Save a useful filter set if you expect to revisit the same group of imports.
        </p>
        <div className="action-bar">
          <button className="primary-btn" type="button" onClick={handleSaveCurrentView} disabled={!savedViewName.trim()}>
            Save Current Search
          </button>
          <button className="secondary-btn" type="button" onClick={() => setShowSavedSearches((value) => !value)}>
            {showSavedSearches ? "Hide Saved Searches" : "Show Saved Searches"}
          </button>
        </div>
        {!showSavedSearches ? (
          <p className="muted">Saved searches are optional. Open them only if you want reusable filter presets.</p>
        ) : loading ? (
          <p className="muted">Loading saved searches...</p>
        ) : !savedViewsResult?.latest?.views.length ? (
          <p className="muted">No saved searches yet.</p>
        ) : (
          <ul className="list collection-list retrieval-list">
            {savedViewsResult.latest.views.map((view) => (
              <li key={view.id} className="collection-item">
                <div><strong>{view.name}</strong></div>
                <div className="muted">
                  {view.filters.vendor || "all vendors"} | {view.filters.topic || "all topics"} | {view.filters.status}
                </div>
                <div className="muted">{view.filters.from || "any time"} to {view.filters.to || "now"}</div>
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
        <h2>Search Tips</h2>
        <div className="action-bar">
          <button className="secondary-btn" type="button" onClick={() => setShowSearchTips((value) => !value)}>
            {showSearchTips ? "Hide Tips" : "Show Tips"}
          </button>
        </div>
        {!showSearchTips ? (
          <p className="muted">Keep this tucked away unless you want a quick reminder of how search behaves.</p>
        ) : loading ? (
          <p className="muted">Loading search tips...</p>
        ) : !indexResult?.latest ? (
          <p className="muted">Suggestions appear once imports have been indexed.</p>
        ) : (
          <>
            <p className="muted">Start with `Search` if you know a title, phrase, or path clue.</p>
            <p className="muted">Use vendor chips for fast narrowing. Open advanced filters only when date or status actually matters.</p>
            <p className="muted">Visible topics: {topicsVisible.slice(0, 6).join(", ") || "none visible"}</p>
            <p className="muted">Search index updated: {new Date(indexResult.latest.generatedAt).toLocaleString()}</p>
          </>
        )}
      </div>

      <div className="panel large">
        {loading || !indexResult?.latest ? null : visibleEntries.length === 0 ? (
          <p className="muted">No imports match the current filters.</p>
        ) : (
          <div className="import-history-grid">
            <div>
              <ul className="list collection-list retrieval-list">
                {visibleEntries.map((entry) => {
                  const selected = detailEntry?.filePath === entry.filePath && detailEntry?.runAt === entry.runAt;
                  return (
                    <li
                      key={entry.runAt + "|" + entry.filePath}
                      className={selected ? "collection-item selected-row" : "collection-item"}
                      onClick={() => setSelectedEntry(entry)}
                    >
                      <div><strong>{entry.vendorSources.join(", ") || formatEntryKindLabel(entry.kind)}</strong></div>
                      <div className="muted">{formatEntryKindLabel(entry.kind)} | {entry.status}</div>
                      <div className="muted">{entry.topicHints.slice(0, 3).join(", ") || "No topic hints"}</div>
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
                    <strong>Selected Import</strong>
                    <p className="muted">{detailEntry.message}</p>
                    <p className="muted">
                      {detailEntry.vendorSources.join(", ") || "document/generic"} | {formatEntryKindLabel(detailEntry.kind)} | {detailEntry.status}
                    </p>
                    {detailEntry.topicHints.length > 0 ? (
                      <p className="muted">Topic hints: {detailEntry.topicHints.slice(0, 3).join(", ")}</p>
                    ) : null}
                    {typeof detailEntry.messageCount === "number" ? (
                      <p className="muted">
                        Conversations: {detailEntry.conversationCount ?? 0} | Messages: {detailEntry.messageCount}
                      </p>
                    ) : null}
                    <div className="action-bar">
                      <button
                        className="secondary-btn"
                        type="button"
                        onClick={() => setShowImportDetails((value) => !value)}
                      >
                        {showImportDetails ? "Hide Details" : "Show Details"}
                      </button>
                      <button
                        className="secondary-btn"
                        type="button"
                        onClick={() => setSavedViewName(detailEntry.titleHints[0] || detailEntry.topicHints[0] || "Saved search")}
                      >
                        Use As Search Name
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
                          Open Output File
                        </button>
                      ))}
                    </div>
                  </div>

                  {showImportDetails ? (
                    <>
                      <p className="muted">File: {detailEntry.filePath}</p>
                      <p className="muted">Imported from: {detailEntry.inputPath}</p>
                      {detailEntry.titleHints.length > 0 ? (
                        <p className="muted">Titles: {detailEntry.titleHints.join(", ")}</p>
                      ) : null}
                      {formatDateRange(detailEntry.startedAt, detailEntry.endedAt) ? (
                        <p className="muted">Conversation date range: {formatDateRange(detailEntry.startedAt, detailEntry.endedAt)}</p>
                      ) : null}
                      <p className="muted">Linked conversation IDs: {detailEntry.conversationIds.length}</p>
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
                              <td>Import type</td>
                              <td>{formatEntryKindLabel(detailEntry.kind)}</td>
                            </tr>
                            <tr>
                              <td>Content type</td>
                              <td>{detailEntry.sourceCategory ?? "unknown"}</td>
                            </tr>
                            <tr>
                              <td>Topic hints</td>
                              <td>{detailEntry.topicHints.join(", ") || "none"}</td>
                            </tr>
                            <tr>
                              <td>Related segments</td>
                              <td>{linkedSegments.length}</td>
                            </tr>
                            <tr>
                              <td>Output files</td>
                              <td>{detailEntry.artifactPaths.length}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : null}
                </>
              ) : (
                <p className="muted">Select an import to inspect it.</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="panel large">
        <div className="panel-heading-row">
          <h2>{linkedSegments.length > 0 ? "Related Conversation Segments" : "Matching Conversation Segments"}</h2>
          {segmentIndexResult?.latest ? (
            <button className="secondary-btn" type="button" onClick={() => revealDesktopPath(segmentIndexResult.latestFile)}>
              Open Segment Data File
            </button>
          ) : null}
        </div>
        <p className="muted">
          Segment review is for deeper inspection after you already have the right import selected.
        </p>
        <div className="action-bar">
          <button className="secondary-btn" type="button" onClick={() => setShowSegmentReview((value) => !value)}>
            {showSegmentReview ? "Hide Segment Review" : "Show Segment Review"}
          </button>
        </div>
        {!showSegmentReview ? (
          <p className="muted">Leave this closed for a calmer search workflow.</p>
        ) : loading ? (
          <p className="muted">
            Loading conversation segments...
          </p>
        ) : !segmentIndexResult?.latest ? (
          <p className="muted">
            Conversation segments will appear here after an import produces dataset output.
          </p>
        ) : visibleSegments.length === 0 ? (
          <p className="muted">No conversation segments match the current filters.</p>
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
                  return (
                    <li
                      key={segmentKey(entry)}
                      className={selected ? "collection-item selected-row" : "collection-item"}
                      onClick={() => setSelectedSegment(entry)}
                    >
                      <div><strong>{entry.summaryLabel ?? entry.topic}</strong></div>
                      <div className="muted">
                        {entry.source}
                        {entry.intent ? ` | ${entry.intent}` : ""}
                        {entry.importance ? ` | ${entry.importance} importance` : ""}
                      </div>
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
                    <strong>Conversation Segment</strong>
                    <p className="muted">Topic: {detailSegment.summaryLabel ?? detailSegment.topic}</p>
                    <p className="muted">Source: {detailSegment.source}</p>
                    {detailSegment.intent || detailSegment.importance ? (
                      <p className="muted">
                        {detailSegment.intent ? `Intent: ${detailSegment.intent}` : "Intent: unknown"}
                        {detailSegment.importance ? ` | Importance: ${detailSegment.importance}` : ""}
                      </p>
                    ) : null}
                    <p className="muted">Conversation ID: {detailSegment.conversationId}</p>
                    {detailSegment.title ? <p className="muted">Title: {detailSegment.title}</p> : null}
                    <p className="muted">
                      Span: {detailSegment.startIndex} to {detailSegment.endIndex} | Messages: {detailSegment.messageCount}
                    </p>
                    <p className="muted">
                      Signal tier: {detailSegment.signalTier} | Redactions: {detailSegment.redactionCount}
                    </p>
                    {detailSegment.createdAt ? (
                      <p className="muted">Created: {new Date(detailSegment.createdAt).toLocaleString()}</p>
                    ) : null}
                  </div>

                  <div className="record-block">{detailSegment.text}</div>
                </>
              ) : (
                <p className="muted">Select a segment to inspect it.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function describeOutputRoot(outputRoot: string): string {
  const normalized = outputRoot.replace(/[\\/]+$/, "");
  const segments = normalized.split(/[\\/]/).filter(Boolean);
  const label = segments[segments.length - 1] ?? outputRoot;
  return label === outputRoot ? outputRoot : `${label} (${outputRoot})`;
}
