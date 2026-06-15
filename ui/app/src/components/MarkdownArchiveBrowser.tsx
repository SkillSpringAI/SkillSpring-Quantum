import type {
  MarkdownArchiveFile,
  MarkdownArchiveTopic
} from "../types/markdownArchive";

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
            {topics.map((topic) => (
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
          </div>

          <div>
            <h3>{selectedFile?.name ?? "Select a markdown file"}</h3>
            {selectedFile ? <code>{selectedFile.path}</code> : null}
            <pre className="record-block markdown-preview">
              {content || "No markdown content loaded."}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
