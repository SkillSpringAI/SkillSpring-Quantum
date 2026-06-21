import type { ArchiveNotification } from "../types/notifications";
import { describeArchiveNotification } from "../services/archiveNotificationsBridge";
import { revealDesktopPath } from "../services/pathBridge";

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
            <button className="secondary-btn" type="button" onClick={() => revealDesktopPath(latest.output_file)}>
              Open Latest Markdown File
            </button>
            {latestFilePath ? (
              <button className="secondary-btn" type="button" onClick={() => revealDesktopPath(latestFilePath)}>
                Open Latest Event File
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="muted">No readable archive updates found yet for this output folder.</p>
      )}

      {events.length > 0 ? (
        <>
          {eventsFilePath ? (
            <div className="action-bar">
              <button className="secondary-btn" type="button" onClick={() => revealDesktopPath(eventsFilePath)}>
                Open Archive Events Log
              </button>
            </div>
          ) : null}
          <ul className="archive-event-list">
            {events.map((event) => (
              <li key={event.hash + event.notified_at}>
                <div>
                  <span>{describeArchiveNotification(event)}</span>
                  <small>{new Date(event.notified_at).toLocaleString()}</small>
                </div>
                <button className="secondary-btn chip-btn" type="button" onClick={() => revealDesktopPath(event.output_file)}>
                  Open File
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="muted">Recent archive updates will appear here after an import writes conversation output.</p>
      )}
    </div>
  );
}
