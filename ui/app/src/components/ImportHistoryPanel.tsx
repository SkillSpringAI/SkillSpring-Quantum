import type { ImportHistoryResult, ImportRunSummary } from "../types/importHistory";
import { revealDesktopPath } from "../services/pathBridge";

interface ImportHistoryPanelProps {
  history: ImportHistoryResult | null;
  selectedRun: ImportRunSummary | null;
  onSelectRun: (run: ImportRunSummary) => void;
  onRefresh?: () => void;
}

export default function ImportHistoryPanel({
  history,
  selectedRun,
  onSelectRun,
  onRefresh
}: ImportHistoryPanelProps) {
  async function handleOpenPath(targetPath: string) {
    await revealDesktopPath(targetPath);
  }

  return (
    <div className="panel large">
      <div className="panel-heading-row">
        <h2>Import History</h2>
        {onRefresh ? (
          <button className="secondary-btn" type="button" onClick={onRefresh}>
            Refresh
          </button>
        ) : null}
      </div>

      {!history || history.runs.length === 0 ? (
        <p className="muted">No import history found for this output root yet.</p>
      ) : (
        <div className="import-history-grid">
          <div>
            <ul className="list collection-list">
              {history.runs.map((run) => {
                const key = run.historyPath || run.runAt;
                const selected = selectedRun?.runAt === run.runAt;
                return (
                  <li
                    key={key}
                    className={selected ? "collection-item selected-row" : "collection-item"}
                    onClick={() => onSelectRun(run)}
                  >
                    <div><strong>{new Date(run.runAt).toLocaleString()}</strong></div>
                    <div className="muted">
                      {run.filesImported} imported, {run.filesFailed} failed, {run.unsupportedFilesSkipped} skipped
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            {selectedRun ? (
              <>
                <div className="detail-box">
                  <strong>Run Summary</strong>
                  <p className="muted">Source: {selectedRun.inputPath}</p>
                  <p className="muted">Output: {selectedRun.outputRoot}</p>
                  <p className="muted">
                    Imported {selectedRun.filesImported} of {selectedRun.filesDiscovered} file(s)
                  </p>
                  <p className="muted">
                    ChatGPT: {selectedRun.conversationFilesProcessed} | Generic: {selectedRun.genericDocumentsProcessed} | PDF: {selectedRun.pdfFilesArchived}
                  </p>
                  {selectedRun.artifacts.length > 0 ? (
                    <div className="action-bar">
                      {selectedRun.artifacts.slice(0, 6).map((artifact) => (
                        <button
                          key={artifact.label + artifact.path}
                          className="primary-btn"
                          type="button"
                          onClick={() => handleOpenPath(artifact.path)}
                        >
                          Open {artifact.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="table-wrap">
                  <table className="review-table">
                    <thead>
                      <tr>
                        <th>Status</th>
                        <th>Kind</th>
                        <th>Path</th>
                        <th>Message</th>
                        <th>Outputs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRun.results.map((result) => (
                        <tr key={result.path + result.kind}>
                          <td>{result.status}</td>
                          <td>{result.kind}</td>
                          <td>{result.path}</td>
                          <td>{result.message}</td>
                          <td>
                            {result.artifacts && result.artifacts.length > 0 ? (
                              <div className="inline-action-list">
                                {result.artifacts.map((artifact) => (
                                  <button
                                    key={artifact.label + artifact.path}
                                    className="secondary-btn compact-btn"
                                    type="button"
                                    onClick={() => handleOpenPath(artifact.path)}
                                  >
                                    {artifact.label}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <span className="muted">No direct outputs listed</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="muted">Select an import run to inspect file-level results.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
