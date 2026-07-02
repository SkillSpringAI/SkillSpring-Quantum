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
  const [loadingArchiveState, setLoadingArchiveState] = useState(true);
  const [loadingSelectedContent, setLoadingSelectedContent] = useState(false);
  const [archiveLoadError, setArchiveLoadError] = useState<string | null>(null);
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

  async function refreshMarkdownArchive(
    filePath?: string,
    options: { includeContent?: boolean; includeTopics?: boolean } = {}
  ) {
    const result = await loadMarkdownArchive(settings.outputRoot, filePath, options);

    if (result.attachmentSummaries.length > 0) {
      setAttachmentSummaries(result.attachmentSummaries);
    }

    if (options.includeTopics === false) {
      if (result.selectedFile) {
        setSelectedFile((previous) => {
          if (previous && previous.path === result.selectedFile?.path) {
            return {
              ...previous,
              ...result.selectedFile,
              attachments: result.selectedFile.attachments ?? previous.attachments ?? []
            };
          }

          return result.selectedFile;
        });
      }
      setContent(result.content);
      return;
    }

    setTopics(result.topics);
    setSelectedFile(result.selectedFile);
    setContent(result.content);
    setAttachmentSummaries(result.attachmentSummaries);
  }

  async function handleSelectFile(file: MarkdownArchiveFile) {
    setSelectedFile(file);
    setContent("");
    setLoadingSelectedContent(true);
    try {
      await refreshMarkdownArchive(file.path, {
        includeContent: true,
        includeTopics: false
      });
    } finally {
      setLoadingSelectedContent(false);
    }
  }

  async function refreshAll() {
    setLoadingArchiveState(true);
    setArchiveLoadError(null);

    try {
      await Promise.all([
        refreshArchiveNotifications(),
        refreshMarkdownArchive(undefined, {
          includeContent: false,
          includeTopics: true
        })
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Quantum could not load the readable archive for this output root.";
      setArchiveLoadError(message);
      setTopics([]);
      setSelectedFile(null);
      setContent("");
      setAttachmentSummaries([]);
      setLoadingSelectedContent(false);
    } finally {
      setLoadingArchiveState(false);
    }
  }

  useEffect(() => {
    setLoadingArchiveState(true);
    setArchiveLoadError(null);
    setLatestArchive(null);
    setArchiveEvents([]);
    setArchiveEventsFile("");
    setArchiveLatestFile("");
    setTopics([]);
    setSelectedFile(null);
    setContent("");
    setAttachmentSummaries([]);
    setLoadingSelectedContent(false);
    refreshAll();
  }, [settings.outputRoot]);

  useEffect(() => {
    if (!selectedFile || content || loadingArchiveState || loadingSelectedContent) return;

    let cancelled = false;

    async function loadSelectedContent() {
      setLoadingSelectedContent(true);
      try {
        await refreshMarkdownArchive(selectedFile.path, {
          includeContent: true,
          includeTopics: false
        });
      } finally {
        if (!cancelled) {
          setLoadingSelectedContent(false);
        }
      }
    }

    void loadSelectedContent();

    return () => {
      cancelled = true;
    };
  }, [selectedFile?.path, content, loadingArchiveState, loadingSelectedContent]);

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

      <div className="panel workspace-anchor-panel">
        <h2>Readable Archive</h2>
        {loadingArchiveState ? (
          <>
            <p className="muted">
              Loading the readable archive for this folder.
            </p>
            <p className="muted">
              Current folder: {describeOutputRoot(settings.outputRoot)}
            </p>
            {latestArchive ? (
              <p className="muted">
                A recent archive update was found, so the conversation list is still loading.
              </p>
            ) : null}
          </>
        ) : archiveLoadError ? (
          <>
            <p className="muted">
              Readable Archive could not load for this folder yet.
            </p>
            <p className="muted">
              Current folder: {describeOutputRoot(settings.outputRoot)}
            </p>
            <p className="muted">{archiveLoadError}</p>
            <div className="action-bar">
              <button className="secondary-btn" type="button" onClick={refreshAll}>
                Try Refresh Again
              </button>
              <button className="primary-btn" type="button" onClick={() => setActiveScreen("imports")}>
                Go To Imports
              </button>
            </div>
          </>
        ) : topics.length === 0 ? (
          <>
            <p className="muted">
              No readable archive yet. Import a conversation export first, then come back here to read it.
            </p>
            <p className="muted">
              Current folder: {describeOutputRoot(settings.outputRoot)}
            </p>
            {latestArchive ? (
              <p className="muted">
                A recent archive update exists here, but no readable topic folders were available to open yet.
              </p>
            ) : null}
            <div className="action-bar">
              <button className="primary-btn" type="button" onClick={() => setActiveScreen("imports")}>
                Go To Imports
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="detail-box loaded-state-card">
              <strong>{archiveSummary.headline}</strong>
              <p className="muted">Current folder: {describeOutputRoot(settings.outputRoot)}</p>
              <p className="muted">{archiveSummary.note}</p>
              <div className="signal-badge-row">
                <span className="signal-badge success">archive loaded</span>
                <span className="signal-badge">{topics.length} topic group(s)</span>
                <span className="signal-badge">{archiveFileCount} readable file(s)</span>
              </div>
            </div>
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
                <li>Use this screen when you want the easiest readable view of imported conversations.</li>
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
              These summaries help you confirm whether linked files or uploaded blobs were preserved with the readable archive.
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
        loadingSelectedContent={loadingSelectedContent}
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
      headline: `${conversationCount} conversation(s) are represented here across ${fileCount} readable slice(s).`,
      note:
        topicCount > 0
          ? `${topicCount} topic group(s) are available. A single conversation can create more than one readable slice when it is long or shifts topic.`
          : "The latest readable slice opens automatically."
    };
  }

  return {
    headline: `${fileCount} readable slice(s) are available here.`,
    note: `${topicCount} topic group(s) are available. The latest readable slice opens automatically.`
  };
}
