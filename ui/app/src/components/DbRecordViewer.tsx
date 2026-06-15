import type { DbRecord } from "../types/db";

interface Props {
  records: DbRecord[];
}

export default function DbRecordViewer(props: Props) {
  if (props.records.length === 0) {
    return (
      <div className="panel">
        <h2>Records</h2>
        <p className="muted">No records loaded.</p>
      </div>
    );
  }

  return (
    <div className="panel">
      <h2>Records</h2>
      <p className="muted">Showing {props.records.length} record(s)</p>
      <div className="record-list">
        {props.records.map((r) => (
          <pre key={r.id} className="record-block">
            {r.content}
          </pre>
        ))}
      </div>
    </div>
  );
}
