import type { RunLogEntry } from "../types/imports";

interface RunLogPanelProps {
  entries: RunLogEntry[];
}

export default function RunLogPanel(props: RunLogPanelProps) {
  return (
    <div className="panel">
      <h2>Run Log</h2>

      {props.entries.length === 0 ? (
        <p className="muted">No log entries yet.</p>
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
