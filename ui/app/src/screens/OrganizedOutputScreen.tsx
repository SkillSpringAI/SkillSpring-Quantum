import { useEffect, useState } from "react";
import ArchiveNotificationPanel from "../components/ArchiveNotificationPanel";
import MarkdownArchiveBrowser from "../components/MarkdownArchiveBrowser";
import type { ArchiveNotification } from "../types/notifications";
import type {
  AttachmentArchiveSummary,
  MarkdownArchiveFile,
  MarkdownArchiveTopic
} from "../types/markdownArchive";
import { loadArchiveNotifications } from "../services/archiveNotificationsBridge";
import { loadMarkdownArchive } from "../services/markdownArchiveBridge";
import { revealDesktopPath } from "../services/pathBridge";
import { useNavigation } from "../state/navigationContext";

export default function OrganizedOutputScreen() {
  const { setActiveScreen } = useNavigation();
  const [latestArchive, setLatestArchive] = useState<ArchiveNotification | null>(null);
  const [archiveEvents, setArchiveEvents] = useState<ArchiveNotification[]>([]);
  const [topics, setTopics] = useState<MarkdownArchiveTopic[]>([]);
  const [selectedFile, setSelectedFile] = useState<MarkdownArchiveFile | null>(null);
  const [content, setContent] = useState("");
  const [attachmentSummaries, setAttachmentSummaries] = useState<AttachmentArchiveSummary[]>([]);

  async function refreshArchiveNotifications() {
    const result = await loadArchiveNotifications("organized_output", 12);
    setLatestArchive(result.latest);
    setArchiveEvents(result.events);
  }

  async function refreshMarkdownArchive(filePath?: string) {
    const result = await loadMarkdownArchive("organized_output", filePath);
    setTopics(result.topics);
    setSelectedFile(result.selectedFile);
    setContent(result.content);
    setAttachmentSummaries(result.attachmentSummaries);
  }

  async function handleSelectFile(file: MarkdownArchiveFile) {
    await refreshMarkdownArchive(file.path);
  }

  async function refreshAll() {
    await refreshArchiveNotifications();
    await refreshMarkdownArchive(selectedFile?.path);
  }

  useEffect(() => {
    refreshArchiveNotifications();
    refreshMarkdownArchive();
  }, []);

  return (
    <section className="screen-grid">
      <ArchiveNotificationPanel
        latest={latestArchive}
        events={archiveEvents}
        onRefresh={refreshAll}
      />

      <div className="panel">
        <h2>Readable Archive</h2>
        {topics.length === 0 ? (
          <>
            <p className="muted">
              No readable archive files are available yet. Start in Imports, run a conversation import, then come back here to read the archive output.
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
              This is the main place to read back what Quantum created from your imported conversations.
            </p>
            <ul className="list">
              <li>Readable markdown is grouped by topic so you can browse what was imported quickly.</li>
              <li>Recent archive updates show which files were written, backed up, skipped, or replaced.</li>
              <li>These archive files come from the same imported conversation content used for datasets.</li>
              <li>When vendor exports included uploaded files or linked files, preserved attachments are summarized separately below.</li>
            </ul>
          </>
        )}
      </div>

      <div className="panel">
        <h2>Preserved Files</h2>
        {attachmentSummaries.length === 0 ? (
          <p className="muted">
            No preserved vendor attachment archives were detected for this output folder yet.
          </p>
        ) : (
          <>
            <p className="muted">
              These summaries help you verify whether linked files or uploaded blobs were preserved alongside the readable archive.
            </p>
            <div className="stats-grid two-col">
              {attachmentSummaries.map((summary) => (
                <div key={summary.vendor} className="stat-card">
                  <span className="label">{formatAttachmentVendorLabel(summary.vendor)}</span>
                  <strong>{summary.attachmentsArchived} preserved</strong>
                  <p className="muted">
                    {summary.attachmentsReferenced} referenced | {summary.attachmentsMissing} missing
                  </p>
                  <div className="action-bar">
                    <button
                      className="secondary-btn"
                      type="button"
                      onClick={() => revealDesktopPath(summary.archiveRoot)}
                    >
                      Open Preserved Files
                    </button>
                    <button
                      className="secondary-btn"
                      type="button"
                      onClick={() => revealDesktopPath(summary.manifestPath)}
                    >
                      Open Preservation Manifest
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <MarkdownArchiveBrowser
        topics={topics}
        selectedFile={selectedFile}
        content={content}
        onSelectFile={handleSelectFile}
        onRefresh={refreshAll}
      />
    </section>
  );
}

function formatAttachmentVendorLabel(vendor: AttachmentArchiveSummary["vendor"]): string {
  return vendor === "grok" ? "Grok attachments" : "Gemini attachments";
}
