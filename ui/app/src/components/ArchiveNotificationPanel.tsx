import { useState } from "react";
import type { ArchiveNotification } from "../types/notifications";
import { describeArchiveNotification } from "../services/archiveNotificationsBridge";
import OpenPathButton from "./OpenPathButton";

interface ArchiveNotificationPanelProps {
  latest: ArchiveNotification | null;
  events: ArchiveNotification[];
  latestFilePath?: string;
  eventsFilePath?: string;
  onRefresh?: () => void;
}

export default function ArchiveNotificationPanel({
  latest,
  events,
  latestFilePath,
  eventsFilePath,
  onRefresh
}: ArchiveNotificationPanelProps) {
  const [showEventLog, setShowEventLog] = useState(false);

  return (
    <div className="panel">
      <div className="panel-heading-row">
        <h2>Readable Archive Updates</h2>
        {onRefresh ? (
          <button className="secondary-btn" type="button" onClick={onRefresh}>
            Refresh
          </button>
        ) : null}
      </div>

      {latest ? (
        <div className="detail-box">
          <strong>{latest.message}</strong>
          <p className="muted">{describeArchiveNotification(latest)}</p>
          <p className="muted">
            Latest file written: {latest.title || latest.topic || "archive output"}
          </p>
          <div className="action-bar">
            <OpenPathButton
              className="secondary-btn"
              targetPath={latest.output_file}
              missingText="Latest markdown file is no longer available."
            >
              Open Latest Markdown File
            </OpenPathButton>
            {latestFilePath ? (
              <OpenPathButton className="secondary-btn" targetPath={latestFilePath}>
                Open Latest Event File
              </OpenPathButton>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="muted">No readable archive updates found yet for this output folder.</p>
      )}

      {events.length > 0 ? (
        <>
          <p className="muted">
            {events.length} recent archive update(s) are available.
          </p>
          <div className="action-bar">
            <button
              className="secondary-btn"
              type="button"
              onClick={() => setShowEventLog((value) => !value)}
            >
              {showEventLog ? "Hide Update Log" : "Show Update Log"}
            </button>
            {eventsFilePath ? (
              <OpenPathButton className="secondary-btn" targetPath={eventsFilePath}>
                Open Archive Events Log
              </OpenPathButton>
            ) : null}
          </div>
          {showEventLog ? (
            <ul className="archive-event-list">
              {events.map((event) => (
                <li key={event.hash + event.notified_at}>
                  <div>
                    <span>{describeArchiveNotification(event)}</span>
                    <small>{new Date(event.notified_at).toLocaleString()}</small>
                  </div>
                  <OpenPathButton className="secondary-btn chip-btn" targetPath={event.output_file}>
                    Open File
                  </OpenPathButton>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : (
        <p className="muted">Recent archive updates will appear here after an import writes conversation output.</p>
      )}
    </div>
  );
}
