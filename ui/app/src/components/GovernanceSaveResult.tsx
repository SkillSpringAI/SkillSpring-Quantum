import type { GovernanceSaveResult } from "../types/governance";

interface Props {
  result: GovernanceSaveResult | null;
}

export default function GovernanceSaveResult(props: Props) {
  if (!props.result) {
    return (
      <div className="panel">
        <h2>Save Result</h2>
        <p className="muted">No governance save has been attempted yet.</p>
      </div>
    );
  }

  const result = props.result;

  return (
    <div className="panel">
      <h2>Save Result</h2>
      <p className={result.ok ? "save-ok" : "save-error"}>
        {result.message}
      </p>

      {result.filePath ? <p><strong>File:</strong> {result.filePath}</p> : null}
      {result.backupPath ? <p><strong>Backup:</strong> {result.backupPath}</p> : null}
      {result.reportPath ? <p><strong>Report:</strong> {result.reportPath}</p> : null}
      {typeof result.code === "number" ? <p><strong>Exit code:</strong> {result.code}</p> : null}

      {result.stderr ? (
        <>
          <h3>stderr</h3>
          <pre className="record-block">{result.stderr}</pre>
        </>
      ) : null}

      {result.stdout ? (
        <>
          <h3>stdout</h3>
          <pre className="record-block">{result.stdout}</pre>
        </>
      ) : null}
    </div>
  );
}
