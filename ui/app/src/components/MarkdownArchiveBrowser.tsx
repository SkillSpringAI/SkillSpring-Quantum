import { useMemo, useState } from "react";
import type {
  MarkdownArchiveFile,
  MarkdownArchiveTopic
} from "../types/markdownArchive";
import { revealDesktopPath } from "../services/pathBridge";
import { useNavigation } from "../state/navigationContext";

interface MarkdownArchiveBrowserProps {
  topics: MarkdownArchiveTopic[];
  selectedFile: MarkdownArchiveFile | null;
  content: string;
  onSelectFile: (file: MarkdownArchiveFile) => void;
  onRefresh: () => void;
}

type ArchiveSortMode = "newest" | "oldest" | "topic";

export default function MarkdownArchiveBrowser({
  topics,
  selectedFile,
  content,
  onSelectFile,
  onRefresh
}: MarkdownArchiveBrowserProps) {
  const { openRetrievalInvestigation, openDatasetInvestigation } = useNavigation();
  const [filterText, setFilterText] = useState("");
  const [sortMode, setSortMode] = useState<ArchiveSortMode>("newest");
  const [activeTopic, setActiveTopic] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const normalizedFilter = filterText.trim().toLowerCase();

  const allSources = useMemo(
    () => [...new Set(topics.flatMap((topic) => topic.files.map((file) => file.source).filter(Boolean)))].sort(),
    [topics]
  );

  const fromTime = dateFrom ? Date.parse(dateFrom + "T00:00:00") : NaN;
  const toTime = dateTo ? Date.parse(dateTo + "T23:59:59") : NaN;

  const visibleTopics = useMemo(() => {
    const filteredTopics = topics
      .map((topic) => {
        const topicSelected = !activeTopic || topic.name === activeTopic;
        const topicMatches = topic.name.toLowerCase().includes(normalizedFilter);
        const files = topic.files
          .filter((file) => {
            if (!topicSelected) return false;
            if (sourceFilter && file.source !== sourceFilter) return false;
            if (!Number.isNaN(fromTime) || !Number.isNaN(toTime)) {
              const fileTime = file.createdAt
                ? Date.parse(file.createdAt)
                : file.modifiedAt
                  ? Date.parse(file.modifiedAt)
                  : NaN;
              if (!Number.isNaN(fromTime) && !Number.isNaN(fileTime) && fileTime < fromTime) return false;
              if (!Number.isNaN(toTime) && !Number.isNaN(fileTime) && fileTime > toTime) return false;
            }
            if (!normalizedFilter) return true;
            return (
              file.name.toLowerCase().includes(normalizedFilter) ||
              file.path.toLowerCase().includes(normalizedFilter) ||
              file.previewText.toLowerCase().includes(normalizedFilter)
            );
          })
          .sort((left, right) => compareArchiveFiles(left, right, sortMode));

        if (topicMatches && files.length === 0 && !sourceFilter && !dateFrom && !dateTo) {
          return {
            ...topic,
            fileCount: topic.files.length,
            files: [...topic.files].sort((left, right) => compareArchiveFiles(left, right, sortMode))
          };
        }

        return {
          ...topic,
          fileCount: files.length,
          files
        };
      })
      .filter((topic) => {
        if (activeTopic && topic.name !== activeTopic) return false;
        return topic.files.length > 0 || topic.name.toLowerCase().includes(normalizedFilter);
      });

    if (sortMode === "topic") {
      return filteredTopics.sort((left, right) => left.name.localeCompare(right.name));
    }

    return filteredTopics.sort((left, right) => {
      const leftNewest = newestTimestamp(left.files);
      const rightNewest = newestTimestamp(right.files);
      return sortMode === "oldest" ? leftNewest - rightNewest : rightNewest - leftNewest;
    });
  }, [activeTopic, normalizedFilter, sortMode, topics, sourceFilter, dateFrom, dateTo, fromTime, toTime]);

  const activeFilterCount = [
    normalizedFilter,
    activeTopic,
    sourceFilter,
    dateFrom,
    dateTo
  ].filter(Boolean).length;

  function clearFilters() {
    setFilterText("");
    setActiveTopic("");
    setSourceFilter("");
    setDateFrom("");
    setDateTo("");
  }

  const selectedTopic = selectedFile
    ? topics.find((topic) => topic.files.some((file) => file.path === selectedFile.path)) ?? null
    : null;
  const selectedContextBadges = selectedFile ? summarizeArchiveContextBadges(selectedFile) : [];
  const visibleFiles = visibleTopics.flatMap((topic) => topic.files);
  const selectedIndex = selectedFile
    ? visibleFiles.findIndex((file) => file.path === selectedFile.path)
    : -1;
  const previousFile = selectedIndex > 0 ? visibleFiles[selectedIndex - 1] : null;
  const nextFile =
    selectedIndex >= 0 && selectedIndex < visibleFiles.length - 1
      ? visibleFiles[selectedIndex + 1]
      : null;
  const selectedFileDetails = selectedFile ? summarizeArchiveFileDetails(selectedFile) : [];

  return (
    <div className="panel large">
      <div className="panel-heading-row">
        <h2>Markdown Archive</h2>
        <button className="secondary-btn" type="button" onClick={onRefresh}>
          Refresh
        </button>
      </div>

      {topics.length === 0 ? (
        <p className="muted">No topic markdown folders found yet.</p>
      ) : (
        <div className="markdown-archive-grid">
          <div className="markdown-topic-list">
            <label className="form-label tight">
              Find archive files
              <input
                className="text-input"
                type="text"
                value={filterText}
                onChange={(event) => setFilterText(event.target.value)}
                placeholder="topic, file name, path"
              />
            </label>
            <div className="history-filter-grid archive-filter-grid">
              <label className="form-label tight">
                Sort
                <select
                  value={sortMode}
                  onChange={(event) => setSortMode(event.target.value as ArchiveSortMode)}
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="topic">Topic order</option>
                </select>
              </label>
              <label className="form-label tight">
                Topic
                <select
                  value={activeTopic}
                  onChange={(event) => setActiveTopic(event.target.value)}
                >
                  <option value="">All topics</option>
                  {topics
                    .map((topic) => topic.name)
                    .sort((left, right) => left.localeCompare(right))
                    .map((topic) => (
                      <option key={topic} value={topic}>
                        {topic}
                      </option>
                    ))}
                </select>
              </label>
              <label className="form-label tight">
                Source
                <select
                  value={sourceFilter}
                  onChange={(event) => setSourceFilter(event.target.value)}
                >
                  <option value="">All sources</option>
                  {allSources.map((source) => (
                    <option key={source} value={source}>
                      {formatArchiveSourceLabel(source)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-label tight">
                From
                <input
                  className="text-input"
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                />
              </label>
              <label className="form-label tight">
                To
                <input
                  className="text-input"
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                />
              </label>
            </div>
            <div className="retrieval-filter-toolbar">
              <span className="muted">
                {activeFilterCount > 0 ? `${activeFilterCount} active filter(s)` : "No active filters"}
              </span>
              <button className="secondary-btn chip-btn" type="button" onClick={clearFilters}>
                Clear Filters
              </button>
            </div>
            <p className="muted">
              {activeFilterCount > 0
                ? `${visibleTopics.reduce((sum, topic) => sum + topic.files.length, 0)} matching file(s) across readable archive content`
                : `${topics.reduce((sum, topic) => sum + topic.files.length, 0)} archive file(s) across ${topics.length} topic folder(s)`}
            </p>
            {visibleTopics.map((topic) => (
              <div key={topic.path} className="markdown-topic-group">
                <strong>{topic.name}</strong>
                <span className="muted">{topic.fileCount} file(s)</span>
                <ul className="collection-list">
                  {topic.files.map((file) => (
                    <li
                      key={file.path}
                      className={
                        selectedFile?.path === file.path
                          ? "selected-row collection-item"
                          : "collection-item"
                      }
                      onClick={() => onSelectFile(file)}
                    >
                      <div>{file.name}</div>
                      <div className="muted archive-file-meta">{formatArchiveFileMeta(file)}</div>
                      {file.previewText ? (
                        <div className="muted">{file.previewText}</div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {visibleTopics.length === 0 ? (
              <p className="muted">No archive files match the current filter.</p>
            ) : null}
          </div>

          <div>
            <h3>{selectedFile?.name ?? "Select a markdown file"}</h3>
            {selectedFile ? <code>{selectedFile.path}</code> : null}
            {selectedFile ? (
              <div className="detail-box">
                <strong>Archive Context</strong>
                <p className="muted">
                  {summarizeArchiveContext(selectedFile)}
                </p>
                {selectedContextBadges.length > 0 ? (
                  <p className="muted">{selectedContextBadges.join(" | ")}</p>
                ) : null}
                {selectedFileDetails.length > 0 ? (
                  <div className="stats-grid two-col archive-detail-grid">
                    {selectedFileDetails.map((detail) => (
                      <div key={detail.label} className="stat-card">
                        <span className="label">{detail.label}</span>
                        <strong>{detail.value}</strong>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
            {selectedFile ? (
              <div className="action-bar">
                <button
                  className="secondary-btn"
                  type="button"
                  onClick={() => previousFile && onSelectFile(previousFile)}
                  disabled={!previousFile}
                >
                  Previous File
                </button>
                <button
                  className="secondary-btn"
                  type="button"
                  onClick={() => nextFile && onSelectFile(nextFile)}
                  disabled={!nextFile}
                >
                  Next File
                </button>
                <button
                  className="primary-btn"
                  type="button"
                  onClick={() => revealDesktopPath(selectedFile.path)}
                >
                  Open Markdown File
                </button>
                <button
                  className="secondary-btn"
                  type="button"
                  onClick={() =>
                    openRetrievalInvestigation({
                      filters: {
                        text: selectedFile.title ?? "",
                        vendor: selectedFile.source ?? "",
                        topic: selectedFile.topic ?? selectedFile.rawTopic ?? "",
                        status: "all",
                        from: selectedFile.createdAt ? toDateInputValue(selectedFile.createdAt) : "",
                        to: selectedFile.createdAt ? toDateInputValue(selectedFile.createdAt) : ""
                      },
                      suggestedName: selectedFile.topic ?? selectedFile.title ?? "Archive investigation"
                    })
                  }
                >
                  Find Related Import
                </button>
                <button
                  className="secondary-btn"
                  type="button"
                  onClick={() =>
                    openDatasetInvestigation({
                      vendor: selectedFile.source,
                      topic: selectedFile.topic ?? selectedFile.rawTopic,
                      createdAt: selectedFile.createdAt
                    })
                  }
                >
                  Open Related Dataset
                </button>
                {selectedTopic ? (
                  <button
                    className="secondary-btn"
                    type="button"
                    onClick={() => revealDesktopPath(selectedTopic.path)}
                  >
                    Open Topic Folder
                  </button>
                ) : null}
              </div>
            ) : null}
            {selectedFile && visibleFiles.length > 0 ? (
              <p className="muted">
                Viewing file {selectedIndex + 1} of {visibleFiles.length} in the current archive result set.
              </p>
            ) : null}
            {selectedFile ? (
              <p className="muted">
                If this markdown file references preserved attachments, use the Preserved Files panel above to open the archived files or their manifest.
              </p>
            ) : null}
            <pre className="record-block markdown-preview">
              {content || "No markdown content loaded."}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

function compareArchiveFiles(
  left: MarkdownArchiveFile,
  right: MarkdownArchiveFile,
  sortMode: ArchiveSortMode
): number {
  const leftTime = Date.parse(left.modifiedAt);
  const rightTime = Date.parse(right.modifiedAt);

  if (sortMode === "oldest") {
    return leftTime - rightTime || left.name.localeCompare(right.name);
  }

  if (sortMode === "topic") {
    return left.name.localeCompare(right.name) || rightTime - leftTime;
  }

  return rightTime - leftTime || left.name.localeCompare(right.name);
}

function newestTimestamp(files: MarkdownArchiveFile[]): number {
  return files.reduce((latest, file) => {
    const value = Date.parse(file.modifiedAt);
    return Number.isNaN(value) ? latest : Math.max(latest, value);
  }, 0);
}

function summarizeArchiveContext(file: MarkdownArchiveFile): string {
  const parts: string[] = [];

  if (file.title) {
    parts.push(file.title);
  }

  if (file.source) {
    parts.push(formatArchiveSourceLabel(file.source));
  }

  if (file.topic) {
    parts.push("topic: " + file.topic);
  }

  if (file.createdAt) {
    parts.push("conversation date: " + new Date(file.createdAt).toLocaleString());
  }

  return parts.join(" | ") || "Archive metadata is limited for this file.";
}

function summarizeArchiveContextBadges(file: MarkdownArchiveFile): string[] {
  const badges: string[] = [];

  if (file.rawTopic && file.rawTopic !== file.topic) {
    badges.push("raw topic: " + file.rawTopic);
  }

  if (
    typeof file.startIndex === "number" &&
    typeof file.endIndex === "number"
  ) {
    badges.push("segment window: " + file.startIndex + "-" + file.endIndex);
  }

  if (file.conversationId) {
    badges.push("conversation: " + file.conversationId);
  }

  return badges;
}

function formatArchiveSourceLabel(source: string): string {
  switch (source) {
    case "chatgpt":
      return "ChatGPT";
    case "grok":
      return "Grok";
    case "claude":
      return "Claude";
    case "gemini":
      return "Gemini";
    case "copilot":
      return "Copilot";
    default:
      return source;
  }
}

function formatArchiveFileMeta(file: MarkdownArchiveFile): string {
  const parts = [
    file.source ? formatArchiveSourceLabel(file.source) : null,
    file.topic ?? file.rawTopic ?? null,
    file.createdAt ? new Date(file.createdAt).toLocaleDateString() : null,
    new Date(file.modifiedAt).toLocaleString()
  ].filter(Boolean);

  return parts.join(" | ");
}

function summarizeArchiveFileDetails(file: MarkdownArchiveFile): Array<{ label: string; value: string }> {
  const details: Array<{ label: string; value: string }> = [
    { label: "Source", value: file.source ? formatArchiveSourceLabel(file.source) : "Unknown" },
    { label: "Topic", value: file.topic ?? file.rawTopic ?? "Unknown" },
    { label: "Modified", value: new Date(file.modifiedAt).toLocaleString() },
    { label: "Size", value: formatBytes(file.sizeBytes) }
  ];

  if (file.createdAt) {
    details.push({ label: "Conversation Date", value: new Date(file.createdAt).toLocaleString() });
  }

  if (typeof file.startIndex === "number" && typeof file.endIndex === "number") {
    details.push({ label: "Segment Window", value: file.startIndex + " to " + file.endIndex });
  }

  return details;
}

function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "0 B";
  }

  if (value < 1024) {
    return value + " B";
  }

  if (value < 1024 * 1024) {
    return (value / 1024).toFixed(1) + " KB";
  }

  return (value / (1024 * 1024)).toFixed(1) + " MB";
}

function toDateInputValue(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}
