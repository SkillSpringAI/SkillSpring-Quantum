import type { ArchiveNotification } from "../types/notifications";
import { describeArchiveNotification } from "../services/archiveNotificationsBridge";

interface ArchiveNotificationPanelProps {
  latest: ArchiveNotification | null;
  events: ArchiveNotification[];
  onRefresh?: () => void;
}

export default function ArchiveNotificationPanel({
  latest,
  events,
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
        </div>
      ) : (
        <p className="muted">No readable archive updates found yet for this output folder.</p>
      )}

      {events.length > 0 ? (
        <ul className="archive-event-list">
          {events.map((event) => (
            <li key={event.hash + event.notified_at}>
              <span>{describeArchiveNotification(event)}</span>
              <small>{new Date(event.notified_at).toLocaleString()}</small>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">Recent archive updates will appear here after an import writes conversation output.</p>
      )}
    </div>
  );
}
