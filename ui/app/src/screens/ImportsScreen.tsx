import { useState } from "react";
import ImportForm from "../components/ImportForm";
import RunStatusPanel from "../components/RunStatusPanel";
import RunLogPanel from "../components/RunLogPanel";
import ArchiveNotificationPanel from "../components/ArchiveNotificationPanel";
import type {
  ImportJobForm,
  ImportSourceSummary,
  RunLogEntry,
  RunState
} from "../types/imports";
import type { ArchiveNotification } from "../types/notifications";
import {
  activeImportPath,
  chooseFolder,
  chooseImportFile,
  inspectSourcePath,
  submitImportJob,
  updateActiveImportPath
} from "../services/importBridge";
import { loadArchiveNotifications } from "../services/archiveNotificationsBridge";

function makeLogEntry(
  level: RunLogEntry["level"],
  message: string
): RunLogEntry {
  return {
    id: crypto.randomUUID(),
    level,
    message,
    timestamp: new Date().toLocaleTimeString()
  };
}

export default function ImportsScreen() {
  const [form, setForm] = useState<ImportJobForm>({
    mode: "single_file",
    inputFile: "C:\\Users\\Laptop\\Desktop\\ChatGPT Exports\\conversations-000.json",
    inputFolder: "C:\\Users\\Laptop\\Desktop\\ChatGPT Exports",
    outputRoot: "organized_output"
  });

  const [runState, setRunState] = useState<RunState>("idle");
  const [statusMessage, setStatusMessage] = useState("Ready to import.");
  const [logEntries, setLogEntries] = useState<RunLogEntry[]>([]);
  const [latestArchive, setLatestArchive] = useState<ArchiveNotification | null>(null);
  const [archiveEvents, setArchiveEvents] = useState<ArchiveNotification[]>([]);
  const [sourceSummary, setSourceSummary] = useState<ImportSourceSummary | null>(null);

  async function refreshArchiveNotifications() {
    const result = await loadArchiveNotifications(form.outputRoot, 5);
    setLatestArchive(result.latest);
    setArchiveEvents(result.events);
  }

  async function refreshSourceSummary(nextPath?: string) {
    const sourcePath = nextPath ?? activeImportPath(form);
    if (!sourcePath.trim()) {
      setSourceSummary(null);
      return;
    }

    const result = await inspectSourcePath(sourcePath);
    setSourceSummary(result);

    if (result) {
      setLogEntries((prev) => [
        makeLogEntry(
          "info",
          "Inspected source path: " + result.supportedFiles + " supported file(s), " + result.unsupportedFiles + " unsupported."
        ),
        ...prev
      ]);
    }
  }

  async function handleBrowseSource() {
    const nextPath =
      form.mode === "single_file"
        ? await chooseImportFile()
        : await chooseFolder();

    if (!nextPath) return;

    const nextForm = updateActiveImportPath(form, nextPath);
    setForm(nextForm);
    await refreshSourceSummary(nextPath);
  }

  async function handleBrowseOutput() {
    const nextPath = await chooseFolder();
    if (!nextPath) return;
    setForm((prev) => ({ ...prev, outputRoot: nextPath }));
  }

  async function handleSubmit() {
    setRunState("running");
    setStatusMessage("Submitting import job...");
    setLogEntries((prev) => [
      makeLogEntry("info", "Import job submitted from UI scaffold."),
      ...prev
    ]);

    const result = await submitImportJob(form);

    if (result.ok) {
      setRunState("success");
      setStatusMessage(result.message);
      setLogEntries((prev) => [
        makeLogEntry("success", result.message),
        ...prev
      ]);
      await refreshArchiveNotifications();
      await refreshSourceSummary();
      return;
    }

    setRunState("failed");
    setStatusMessage(result.message);
    setLogEntries((prev) => [
      makeLogEntry("error", result.message),
      ...prev
    ]);
  }

  return (
    <section className="screen-grid imports-layout">
      <ImportForm
        value={form}
        onChange={setForm}
        onSubmit={handleSubmit}
        onBrowseSource={handleBrowseSource}
        onBrowseOutput={handleBrowseOutput}
        onInspectSource={refreshSourceSummary}
        disabled={runState === "running"}
      />

      <RunStatusPanel
        state={runState}
        message={statusMessage}
      />

      <ArchiveNotificationPanel
        latest={latestArchive}
        events={archiveEvents}
        onRefresh={refreshArchiveNotifications}
      />

      <div className="panel">
        <h2>Import Notes</h2>
        <ul>
          <li>ChatGPT export JSON files still use the conversation pipeline.</li>
          <li>Generic text and JSON files are archived intact and added to anonymized source document datasets.</li>
          <li>PDF files are archived now and flagged for future text extraction.</li>
          <li>Output root should stay stable across related runs.</li>
        </ul>
      </div>

      <div className="panel large">
        <h2>Source Summary</h2>
        {!sourceSummary ? (
          <p className="muted">Inspect a file or folder to see what SkillSpring Quantum can process from it.</p>
        ) : (
          <>
            <p className="muted">
              {sourceSummary.inputType} at <code>{sourceSummary.inputPath}</code>
            </p>
            <div className="stats-grid two-col">
              <div className="stat-card">
                <span className="label">Supported</span>
                <strong>{sourceSummary.supportedFiles}</strong>
              </div>
              <div className="stat-card">
                <span className="label">Unsupported</span>
                <strong>{sourceSummary.unsupportedFiles}</strong>
              </div>
              <div className="stat-card">
                <span className="label">ChatGPT Exports</span>
                <strong>{sourceSummary.countsByKind.chatgpt_export}</strong>
              </div>
              <div className="stat-card">
                <span className="label">Generic Docs</span>
                <strong>
                  {sourceSummary.countsByKind.text_document + sourceSummary.countsByKind.json_document}
                </strong>
              </div>
              <div className="stat-card">
                <span className="label">PDF</span>
                <strong>{sourceSummary.countsByKind.pdf_document}</strong>
              </div>
              <div className="stat-card">
                <span className="label">Total Files</span>
                <strong>{sourceSummary.totalFiles}</strong>
              </div>
            </div>
            {sourceSummary.notes.length > 0 ? (
              <ul>
                {sourceSummary.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            ) : null}
            {sourceSummary.sampleFiles.length > 0 ? (
              <div className="table-wrap">
                <table className="review-table">
                  <thead>
                    <tr>
                      <th>Kind</th>
                      <th>Path</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sourceSummary.sampleFiles.map((entry) => (
                      <tr key={entry.path}>
                        <td>{entry.kind}</td>
                        <td>{entry.path}</td>
                        <td>{entry.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </>
        )}
      </div>

      <RunLogPanel entries={logEntries} />
    </section>
  );
}
