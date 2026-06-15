interface Props {
  fileName?: string;
  rawText: string;
}

export default function GovernanceLiveSnapshot(props: Props) {
  return (
    <div className="panel">
      <h2>Live Saved Rule</h2>
      <p className="muted">
        {props.fileName ? "Current live content for " + props.fileName : "No rule loaded."}
      </p>
      <pre className="record-block">
        {props.rawText || "No live snapshot available yet."}
      </pre>
    </div>
  );
}
