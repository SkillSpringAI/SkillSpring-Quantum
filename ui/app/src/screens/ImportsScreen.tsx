import { useEffect, useState } from "react";
import ImportForm from "../components/ImportForm";
import ImportHistoryPanel from "../components/ImportHistoryPanel";
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
import { loadImportHistory, searchImportHistory } from "../services/importHistoryBridge";
import { loadArchiveNotifications } from "../services/archiveNotificationsBridge";
import type { ImportHistoryFilters, ImportHistoryResult, ImportRunSummary } from "../types/importHistory";
import { useNavigation } from "../state/navigationContext";

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

function formatSourceEntryKindLabel(kind: ImportSourceSummary["sampleFiles"][number]["kind"]): string {
  switch (kind) {
    case "chatgpt_export":
      return "ChatGPT export";
    case "conversation_json":
      return "Vendor conversation JSON";
    case "json_document":
      return "JSON document";
    case "text_document":
      return "Text document";
    case "pdf_document":
      return "PDF document";
    default:
      return "Unsupported file";
  }
}

function sourceEntryRowClassName(kind: ImportSourceSummary["sampleFiles"][number]["kind"]): string {
  if (kind === "chatgpt_export" || kind === "conversation_json") {
    return "source-summary-row priority-row";
  }

  if (kind === "json_document" || kind === "text_document" || kind === "pdf_document") {
    return "source-summary-row expansion-row";
  }

  return "source-summary-row";
}

function orderedSourceSummaryNotes(notes: string[]): Array<{ text: string; tone: "priority" | "secondary" }> {
  return [...notes]
    .sort((a, b) => notePriority(a) - notePriority(b))
    .map((note) => ({
      text: note,
      tone: notePriority(note) <= 1 ? "priority" : "secondary"
    }));
}

function notePriority(note: string): number {
  const normalized = note.toLowerCase();

  if (normalized.includes("chatgpt exports") || normalized.includes("conversation json files")) {
    return 0;
  }

  if (normalized.includes("unsupported file types")) {
    return 1;
  }

  if (normalized.includes("text and json documents") || normalized.includes("pdf files")) {
    return 2;
  }

  return 3;
}

export default function ImportsScreen() {
  const { openRetrievalInvestigation } = useNavigation();
  const [form, setForm] = useState<ImportJobForm>({
    mode: "single_file",
    inputFile: "C:\\Users\\Laptop\\Desktop\\AI Exports\\claude\\conversation.json",
    inputFolder: "C:\\Users\\Laptop\\Desktop\\AI Exports",
    outputRoot: "organized_output"
  });

  const [runState, setRunState] = useState<RunState>("idle");
  const [statusMessage, setStatusMessage] = useState("Ready to import.");
  const [logEntries, setLogEntries] = useState<RunLogEntry[]>([]);
  const [latestArchive, setLatestArchive] = useState<ArchiveNotification | null>(null);
  const [archiveEvents, setArchiveEvents] = useState<ArchiveNotification[]>([]);
  const [sourceSummary, setSourceSummary] = useState<ImportSourceSummary | null>(null);
  const [importHistory, setImportHistory] = useState<ImportHistoryResult | null>(null);
  const [selectedRun, setSelectedRun] = useState<ImportRunSummary | null>(null);
  const [historyMode, setHistoryMode] = useState<"recent" | "query">("recent");
  const [historySearchBusy, setHistorySearchBusy] = useState(false);

  async function refreshArchiveNotifications() {
    const result = await loadArchiveNotifications(form.outputRoot, 5);
    setLatestArchive(result.latest);
    setArchiveEvents(result.events);
  }

  async function refreshImportHistory() {
    const result = await loadImportHistory(form.outputRoot, 8);
    setImportHistory(result);
    setHistoryMode("recent");
    setSelectedRun((current) => {
      if (!result.latest) return null;
      if (!current) return result.latest;
      return result.runs.find((run) => run.runAt === current.runAt) ?? result.latest;
    });
  }

  async function runHistorySearch(filters: ImportHistoryFilters) {
    setHistorySearchBusy(true);
    setStatusMessage("Searching import history...");
    try {
      const result = await searchImportHistory(form.outputRoot, filters);
      setImportHistory(result);
      setHistoryMode("query");
      setSelectedRun(result.latest);
      setLogEntries((prev) => [
        makeLogEntry("info", "History investigation search completed: " + result.runs.length + " matching run(s)."),
        ...prev
      ]);
    } finally {
      setHistorySearchBusy(false);
    }
  }

  async function resetHistorySearch() {
    setStatusMessage("Ready to import.");
    await refreshImportHistory();
  }

  function handoffRunToRetrieval(run: ImportRunSummary, filters: ImportHistoryFilters) {
    openRetrievalInvestigation({
      filters: {
        text: filters.text,
        vendor: filters.vendor || run.retrievalSummary?.vendorSources[0] || "",
        topic: filters.topic,
        status: filters.status,
        from: filters.from,
        to: filters.to
      },
      suggestedName:
        filters.topic ||
        run.retrievalSummary?.topicHints[0] ||
        run.retrievalSummary?.vendorSources[0] ||
        "Saved investigation"
    });
  }

  function handoffResultToRetrieval(run: ImportRunSummary, resultPath: string, filters: ImportHistoryFilters) {
    openRetrievalInvestigation({
      filters: {
        text: filters.text,
        vendor: filters.vendor || run.retrievalSummary?.vendorSources[0] || "",
        topic: filters.topic,
        status: filters.status,
        from: filters.from,
        to: filters.to
      },
      selectedRecord: {
        runAt: run.runAt,
        filePath: resultPath
      },
      suggestedName:
        filters.topic ||
        run.retrievalSummary?.topicHints[0] ||
        run.retrievalSummary?.vendorSources[0] ||
        "Saved investigation"
    });
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
      await refreshImportHistory();
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

  useEffect(() => {
    refreshImportHistory();
    refreshArchiveNotifications();
  }, [form.outputRoot]);

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
        <p className="muted">
          First-user MVP focus: major AI conversation exports from globally common vendors.
        </p>
        <ul>
          <li>Major AI export files from ChatGPT, Claude, Gemini, Copilot, and Grok are the main first-user workflow.</li>
          <li>Quantum inspects a file or folder first, then reports what it can import, archive, or skip before you run anything.</li>
          <li>Conversation exports become readable archives plus anonymized dataset records in the same local run.</li>
          <li>Grok packages can preserve referenced attachment blobs when those folders are included in the source package.</li>
          <li>Keep one stable output root for related imports so history, retrieval, and datasets stay connected.</li>
        </ul>
        <p className="muted">
          Internal or experimental support remains available for generic JSON, text files, and PDFs, but those are expansion paths rather than the main public MVP promise.
        </p>
      </div>

      <ImportHistoryPanel
        history={importHistory}
        selectedRun={selectedRun}
        onSelectRun={setSelectedRun}
        onRefresh={refreshImportHistory}
        onSearch={runHistorySearch}
        onResetSearch={resetHistorySearch}
        onOpenRunInRetrieval={handoffRunToRetrieval}
        onOpenResultInRetrieval={handoffResultToRetrieval}
        searchMode={historyMode}
        searchBusy={historySearchBusy}
      />

      <div className="panel large">
        <h2>Source Summary</h2>
        {!sourceSummary ? (
          <p className="muted">Inspect a file or folder to see what SkillSpring Quantum can process from it.</p>
        ) : (
          <>
            <p className="muted">
              {sourceSummary.inputType} at <code>{sourceSummary.inputPath}</code>
            </p>
            <p className="muted">
              Major AI exports are the primary first-user workflow. Document imports shown here remain useful, but they are not the core MVP story.
            </p>
            <div className="stats-grid two-col">
              <div className="stat-card accent-card">
                <span className="label">Major AI Export Files</span>
                <strong>
                  {sourceSummary.countsByKind.chatgpt_export + sourceSummary.countsByKind.conversation_json}
                </strong>
              </div>
              <div className="stat-card">
                <span className="label">Supported</span>
                <strong>{sourceSummary.supportedFiles}</strong>
              </div>
              <div className="stat-card">
                <span className="label">Unsupported</span>
                <strong>{sourceSummary.unsupportedFiles}</strong>
              </div>
              <div className="stat-card subdued-card">
                <span className="label">Document Expansion Files</span>
                <strong>
                  {sourceSummary.countsByKind.text_document + sourceSummary.countsByKind.json_document}
                </strong>
              </div>
              <div className="stat-card subdued-card">
                <span className="label">PDF Expansion Files</span>
                <strong>{sourceSummary.countsByKind.pdf_document}</strong>
              </div>
              <div className="stat-card">
                <span className="label">Total Files</span>
                <strong>{sourceSummary.totalFiles}</strong>
              </div>
            </div>
            {sourceSummary.notes.length > 0 ? (
              <ul className="source-note-list">
                {orderedSourceSummaryNotes(sourceSummary.notes).map((note) => (
                  <li
                    key={note.text}
                    className={note.tone === "priority" ? "source-note priority-note" : "source-note secondary-note"}
                  >
                    {note.text}
                  </li>
                ))}
              </ul>
            ) : null}
            {sourceSummary.sampleFiles.length > 0 ? (
              <div className="table-wrap">
                <table className="review-table">
                  <thead>
                    <tr>
                      <th>Detected Type</th>
                      <th>Path</th>
                      <th>What Quantum Will Do</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sourceSummary.sampleFiles.map((entry) => (
                      <tr key={entry.path} className={sourceEntryRowClassName(entry.kind)}>
                        <td>{formatSourceEntryKindLabel(entry.kind)}</td>
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
