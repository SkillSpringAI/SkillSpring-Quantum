import { useMemo, useState } from "react";
import type {
  MarkdownArchiveFile,
  MarkdownArchiveTopic
} from "../types/markdownArchive";
import { revealDesktopPath } from "../services/pathBridge";

interface MarkdownArchiveBrowserProps {
  topics: MarkdownArchiveTopic[];
  selectedFile: MarkdownArchiveFile | null;
  content: string;
  onSelectFile: (file: MarkdownArchiveFile) => void;
  onRefresh: () => void;
}

export default function MarkdownArchiveBrowser({
  topics,
  selectedFile,
  content,
  onSelectFile,
  onRefresh
}: MarkdownArchiveBrowserProps) {
  const [filterText, setFilterText] = useState("");
  const normalizedFilter = filterText.trim().toLowerCase();

  const visibleTopics = useMemo(() => {
    if (!normalizedFilter) {
      return topics;
    }

    return topics
      .map((topic) => {
        const topicMatches = topic.name.toLowerCase().includes(normalizedFilter);
        const files = topic.files.filter((file) =>
          file.name.toLowerCase().includes(normalizedFilter) ||
          file.path.toLowerCase().includes(normalizedFilter)
        );

        if (topicMatches && files.length === 0) {
          return topic;
        }

        return {
          ...topic,
          fileCount: files.length,
          files
        };
      })
      .filter((topic) => topic.files.length > 0 || topic.name.toLowerCase().includes(normalizedFilter));
  }, [normalizedFilter, topics]);

  const selectedTopic = selectedFile
    ? topics.find((topic) => topic.files.some((file) => file.path === selectedFile.path)) ?? null
    : null;

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
            <p className="muted">
              {normalizedFilter
                ? `${visibleTopics.reduce((sum, topic) => sum + topic.files.length, 0)} matching file(s)`
                : `${topics.reduce((sum, topic) => sum + topic.files.length, 0)} archive file(s)`}
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
              <div className="action-bar">
                <button
                  className="primary-btn"
                  type="button"
                  onClick={() => revealDesktopPath(selectedFile.path)}
                >
                  Open Markdown File
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
            <pre className="record-block markdown-preview">
              {content || "No markdown content loaded."}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
