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
import { useSettings } from "../state/settingsContext";

export default function OrganizedOutputScreen() {
  const { setActiveScreen } = useNavigation();
  const { settings } = useSettings();
  const [showArchiveHelp, setShowArchiveHelp] = useState(false);
  const [latestArchive, setLatestArchive] = useState<ArchiveNotification | null>(null);
  const [archiveEvents, setArchiveEvents] = useState<ArchiveNotification[]>([]);
  const [archiveEventsFile, setArchiveEventsFile] = useState("");
  const [archiveLatestFile, setArchiveLatestFile] = useState("");
  const [topics, setTopics] = useState<MarkdownArchiveTopic[]>([]);
  const [selectedFile, setSelectedFile] = useState<MarkdownArchiveFile | null>(null);
  const [content, setContent] = useState("");
  const [attachmentSummaries, setAttachmentSummaries] = useState<AttachmentArchiveSummary[]>([]);

  async function refreshArchiveNotifications() {
    const result = await loadArchiveNotifications(settings.outputRoot, 12);
    setLatestArchive(result.latest);
    setArchiveEvents(result.events);
    setArchiveEventsFile(result.eventsFile);
    setArchiveLatestFile(result.latestFile);
  }

  async function refreshMarkdownArchive(filePath?: string) {
    const result = await loadMarkdownArchive(settings.outputRoot, filePath);
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
    setLatestArchive(null);
    setArchiveEvents([]);
    setArchiveEventsFile("");
    setArchiveLatestFile("");
    setTopics([]);
    setSelectedFile(null);
    setContent("");
    setAttachmentSummaries([]);
    refreshArchiveNotifications();
    refreshMarkdownArchive();
  }, [settings.outputRoot]);

  useEffect(() => {
    if (selectedFile || topics.length === 0) return;
    const allFiles = topics.flatMap((topic) => topic.files);
    if (allFiles.length === 0) return;
    const newest = allFiles.reduce((best, file) => {
      const bestTime = Date.parse(best.modifiedAt);
      const fileTime = Date.parse(file.modifiedAt);
      return fileTime > bestTime ? file : best;
    }, allFiles[0]);
    if (newest) {
      handleSelectFile(newest);
    }
  }, [topics]);

  const archiveFileCount = topics.reduce((sum, topic) => sum + topic.files.length, 0);
  const archiveConversationCount = countArchiveConversations(topics);
  const archiveSummary = summarizeArchiveCollection(
    archiveConversationCount,
    archiveFileCount,
    topics.length
  );

  return (
    <section className="screen-grid">
      <ArchiveNotificationPanel
        latest={latestArchive}
        events={archiveEvents}
        latestFilePath={archiveLatestFile}
        eventsFilePath={archiveEventsFile}
        onRefresh={refreshAll}
      />

      <div className="panel">
        <h2>Readable Archive</h2>
        {topics.length === 0 ? (
          <>
            <p className="muted">
              No readable archive yet. Import a conversation export first, then come back here to read it.
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
              Read back the imported conversations here.
            </p>
            <p className="muted">
              Current output root: {describeOutputRoot(settings.outputRoot)}
            </p>
            <p className="muted">
              {archiveSummary.headline}
            </p>
            <p className="muted">{archiveSummary.note}</p>
            <div className="action-bar">
              <button className="secondary-btn" type="button" onClick={() => setShowArchiveHelp((value) => !value)}>
                {showArchiveHelp ? "Hide Tips" : "Show Tips"}
              </button>
              <button className="secondary-btn" type="button" onClick={() => revealDesktopPath(settings.outputRoot)}>
                Open Output Folder
              </button>
            </div>
            {showArchiveHelp ? (
              <ul className="list">
                <li>Use search to narrow by topic, title, source, or trust clues.</li>
                <li>Use this screen when you want the easiest human-readable view of imported conversations.</li>
                <li>Preserved attachments and dataset handoff live in the selected-file pane.</li>
              </ul>
            ) : null}
          </>
        )}
      </div>

      <div className="panel">
        <h2>Preserved Files</h2>
        {attachmentSummaries.length === 0 ? (
          <p className="muted">
            No preserved attachment archives detected yet.
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
        attachmentSummaries={attachmentSummaries}
        onSelectFile={handleSelectFile}
        onRefresh={refreshAll}
      />
    </section>
  );
}

function describeOutputRoot(outputRoot: string): string {
  const normalized = outputRoot.replace(/[\\/]+$/, "");
  const segments = normalized.split(/[\\/]/).filter(Boolean);
  const label = segments[segments.length - 1] ?? outputRoot;
  return label === outputRoot ? outputRoot : `${label} (${outputRoot})`;
}

function formatAttachmentVendorLabel(vendor: AttachmentArchiveSummary["vendor"]): string {
  return vendor === "grok" ? "Grok attachments" : "Gemini attachments";
}

function countArchiveConversations(topics: MarkdownArchiveTopic[]): number {
  return new Set(
    topics.flatMap((topic) =>
      topic.files.map((file) => file.conversationId).filter((value): value is string => Boolean(value))
    )
  ).size;
}

function summarizeArchiveCollection(
  conversationCount: number,
  fileCount: number,
  topicCount: number
): { headline: string; note: string } {
  if (conversationCount > 0) {
    return {
      headline: `${conversationCount} conversation(s) are represented here across ${fileCount} readable review slice(s).`,
      note:
        topicCount > 0
          ? `${topicCount} topic group(s) are available. A single conversation can create more than one review slice when it is long or shifts topic.`
          : "The latest readable slice opens automatically."
    };
  }

  return {
    headline: `${fileCount} readable review slice(s) are available here.`,
    note: `${topicCount} topic group(s) are available. The latest readable slice opens automatically.`
  };
}
