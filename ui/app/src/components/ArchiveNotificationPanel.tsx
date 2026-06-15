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
        <h2>Human Archive</h2>
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
          <code>{latest.output_file}</code>
        </div>
      ) : (
        <p className="muted">No archive notifications found for this output root yet.</p>
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
      ) : null}
    </div>
  );
}
