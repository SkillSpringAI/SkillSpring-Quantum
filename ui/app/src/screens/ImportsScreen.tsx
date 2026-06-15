import { useState } from "react";
import ImportForm from "../components/ImportForm";
import RunStatusPanel from "../components/RunStatusPanel";
import RunLogPanel from "../components/RunLogPanel";
import ArchiveNotificationPanel from "../components/ArchiveNotificationPanel";
import type { ImportJobForm, RunLogEntry, RunState } from "../types/imports";
import type { ArchiveNotification } from "../types/notifications";
import { submitImportJob } from "../services/importBridge";
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

  async function refreshArchiveNotifications() {
    const result = await loadArchiveNotifications(form.outputRoot, 5);
    setLatestArchive(result.latest);
    setArchiveEvents(result.events);
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
          <li>Single-file mode maps to <code>pipeline.runFile</code></li>
          <li>Batch mode maps to <code>batch.run</code></li>
          <li>Output root should stay stable across related runs</li>
          <li>Desktop shell should later stream real stdout/stderr into the run log</li>
        </ul>
      </div>

      <RunLogPanel entries={logEntries} />
    </section>
  );
}
