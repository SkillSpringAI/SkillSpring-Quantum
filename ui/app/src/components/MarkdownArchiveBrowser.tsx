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
  const normalizedFilter = filterText.trim().toLowerCase();

  const visibleTopics = useMemo(() => {
    const filteredTopics = topics
      .map((topic) => {
        const topicSelected = !activeTopic || topic.name === activeTopic;
        const topicMatches = topic.name.toLowerCase().includes(normalizedFilter);
        const files = topic.files
          .filter((file) =>
            topicSelected && (
              file.name.toLowerCase().includes(normalizedFilter) ||
              file.path.toLowerCase().includes(normalizedFilter) ||
              file.previewText.toLowerCase().includes(normalizedFilter)
            )
          )
          .sort((left, right) => compareArchiveFiles(left, right, sortMode));

        if (topicMatches && files.length === 0) {
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
        if (activeTopic && topic.name !== activeTopic) {
          return false;
        }

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
  }, [activeTopic, normalizedFilter, sortMode, topics]);

  const selectedTopic = selectedFile
    ? topics.find((topic) => topic.files.some((file) => file.path === selectedFile.path)) ?? null
    : null;
  const selectedContextBadges = selectedFile ? summarizeArchiveContextBadges(selectedFile) : [];

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
            </div>
            <p className="muted">
              {normalizedFilter
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
                      <div className="muted">{new Date(file.modifiedAt).toLocaleString()}</div>
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
              </div>
            ) : null}
            {selectedFile ? (
              <div className="action-bar">
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

function toDateInputValue(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}
