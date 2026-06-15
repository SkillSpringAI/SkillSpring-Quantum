import { useEffect, useState } from "react";
import ArchiveNotificationPanel from "../components/ArchiveNotificationPanel";
import MarkdownArchiveBrowser from "../components/MarkdownArchiveBrowser";
import type { ArchiveNotification } from "../types/notifications";
import type {
  MarkdownArchiveFile,
  MarkdownArchiveTopic
} from "../types/markdownArchive";
import { loadArchiveNotifications } from "../services/archiveNotificationsBridge";
import { loadMarkdownArchive } from "../services/markdownArchiveBridge";

export default function OrganizedOutputScreen() {
  const [latestArchive, setLatestArchive] = useState<ArchiveNotification | null>(null);
  const [archiveEvents, setArchiveEvents] = useState<ArchiveNotification[]>([]);
  const [topics, setTopics] = useState<MarkdownArchiveTopic[]>([]);
  const [selectedFile, setSelectedFile] = useState<MarkdownArchiveFile | null>(null);
  const [content, setContent] = useState("");

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
        <h2>Organized Output</h2>
        <p className="muted">
          Topic folders, readable markdown archive status, purge inspection, and restore workflows surface here.
        </p>
        <ul className="list">
          <li>Human-readable markdown is organized by inferred topic.</li>
          <li>Archive events confirm which files were written, backed up, skipped, or replaced.</li>
          <li>Dataset records are derived from the categorized segment content.</li>
        </ul>
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
