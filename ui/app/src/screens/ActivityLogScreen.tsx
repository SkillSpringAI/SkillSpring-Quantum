import RunLogPanel from "../components/RunLogPanel";
import RunStatusPanel from "../components/RunStatusPanel";
import { useNavigation } from "../state/navigationContext";
import { useImportActivity } from "../state/importActivityContext";

function buildActivityDetail(statusMessage: string, importCount: number): string | undefined {
  if (importCount === 0 && statusMessage === "Ready to inspect or import.") {
    return undefined;
  }

  return `${importCount} recorded update(s) | ${statusMessage}`;
}

export default function ActivityLogScreen() {
  const { setActiveScreen } = useNavigation();
  const { runState, statusMessage, importProgress, logEntries } = useImportActivity();

  return (
    <section className="screen-grid">
      <RunStatusPanel
        state={runState}
        message={statusMessage}
        detail={buildActivityDetail(statusMessage, logEntries.length)}
        badges={[
          runState === "running" && importProgress?.processingState
            ? importProgress.processingState.replace(/_/g, " ")
            : "",
          logEntries.length > 0 ? `${logEntries.length} updates` : ""
        ].filter(Boolean)}
        lead={
          runState === "running"
            ? "Quantum keeps recording import activity even while you move across other screens."
            : "Use Activity History to verify what Quantum has been doing step by step, not only when something goes wrong."
        }
      />

      <div className="panel">
        <h2>Why This Helps</h2>
        <p className="muted">
          This screen is here so you can sanity-check what Quantum has been doing without losing context when you leave Imports.
        </p>
        <div className="action-bar">
          <button className="primary-btn" type="button" onClick={() => setActiveScreen("imports")}>
            Go To Imports
          </button>
          <button className="secondary-btn" type="button" onClick={() => setActiveScreen("diagnostics")}>
            Open Diagnostics
          </button>
        </div>
      </div>

      <div className="panel large">
        <h2>Activity History</h2>
        <p className="muted">
          Check this whenever you want to verify the actions Quantum has been taking during source inspection, import progress, stop requests, or follow-up checks.
        </p>
        <RunLogPanel entries={logEntries} />
      </div>
    </section>
  );
}
