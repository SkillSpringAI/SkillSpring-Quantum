import { useEffect, useState } from "react";
import { loadImportHistory } from "../services/importHistoryBridge";
import type { ImportRunSummary } from "../types/importHistory";

export default function DashboardScreen() {
  const [latestRun, setLatestRun] = useState<ImportRunSummary | null>(null);

  useEffect(() => {
    loadImportHistory("organized_output", 1).then((result) => {
      setLatestRun(result.latest);
    });
  }, []);

  return (
    <section className="screen-grid">
      <div className="panel large">
        <h2>System Snapshot</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <span className="label">Latest Import</span>
            <strong>{latestRun ? latestRun.filesImported + " files" : "None yet"}</strong>
          </div>
          <div className="stat-card">
            <span className="label">Generic Docs</span>
            <strong>{latestRun ? latestRun.genericDocumentsProcessed : 0}</strong>
          </div>
          <div className="stat-card">
            <span className="label">ChatGPT Imports</span>
            <strong>{latestRun ? latestRun.conversationFilesProcessed : 0}</strong>
          </div>
          <div className="stat-card">
            <span className="label">Failed Files</span>
            <strong>{latestRun ? latestRun.filesFailed : 0}</strong>
          </div>
        </div>
      </div>

      <div className="panel">
        <h2>Purpose</h2>
        <p className="muted">
          SkillSpring Quantum is a governance-first desktop control plane for ingestion,
          diagnostics, review, and curated dataset refinement.
        </p>
      </div>

      <div className="panel">
        <h2>Latest Import</h2>
        {latestRun ? (
          <>
            <p className="muted">{new Date(latestRun.runAt).toLocaleString()}</p>
            <p className="muted">{latestRun.inputPath}</p>
            <p className="muted">
              Imported {latestRun.filesImported} of {latestRun.filesDiscovered} file(s), skipped {latestRun.unsupportedFilesSkipped}.
            </p>
          </>
        ) : (
          <p className="muted">No import runs recorded yet.</p>
        )}
      </div>
    </section>
  );
}
