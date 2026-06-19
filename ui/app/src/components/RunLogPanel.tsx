import type { RunLogEntry } from "../types/imports";

interface RunLogPanelProps {
  entries: RunLogEntry[];
}

function formatLogHeading(count: number): string {
  if (count === 0) {
    return "Recent Activity";
  }

  if (count === 1) {
    return "Recent Activity (1 update)";
  }

  return "Recent Activity (" + count + " updates)";
}

export default function RunLogPanel(props: RunLogPanelProps) {
  return (
    <div className="panel">
      <h2>{formatLogHeading(props.entries.length)}</h2>

      {props.entries.length === 0 ? (
        <p className="muted">Status updates from source inspection and imports will appear here.</p>
      ) : (
        <ul className="log-list">
          {props.entries.map((entry) => (
            <li key={entry.id} className={"log-entry " + entry.level}>
              <span className="log-time">{entry.timestamp}</span>
              <span>{entry.message}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
