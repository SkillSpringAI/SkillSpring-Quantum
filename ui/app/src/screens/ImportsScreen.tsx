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
  RunState,
  ImportSupportTier
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
import { revealDesktopPath } from "../services/pathBridge";
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
      return "Recovered conversation JSON";
    case "gemini_activity_html":
      return "Gemini My Activity export";
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

function formatSupportTierLabel(tier: ImportSupportTier): string {
  switch (tier) {
    case "mvp_first_class":
      return "Ready now";
    case "mvp_compatibility_fallback":
      return "Recovery path";
    case "experimental_expansion":
      return "Advanced import";
    default:
      return "Not supported";
  }
}

function sourceEntryRowClassName(kind: ImportSourceSummary["sampleFiles"][number]["kind"]): string {
  if (kind === "chatgpt_export" || kind === "conversation_json" || kind === "gemini_activity_html") {
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

function findLatestArchiveArtifactPath(run: ImportRunSummary | null): string | null {
  if (!run) {
    return null;
  }

  const preferred = run.artifacts.find((artifact) => artifact.label === "Latest archived markdown");
  if (preferred) {
    return preferred.path;
  }

  const fallback = run.artifacts.find((artifact) =>
    artifact.label.toLowerCase().includes("archived markdown") ||
    artifact.label.toLowerCase().includes("markdown archive")
  );

  return fallback?.path ?? null;
}

function findLatestDatasetArtifactPath(run: ImportRunSummary | null): string | null {
  if (!run) {
    return null;
  }

  const preferredLabels = [
    "Current prompt/response dataset",
    "Current topic segments dataset",
    "Latest dataset manifest"
  ];

  for (const label of preferredLabels) {
    const match = run.artifacts.find((artifact) => artifact.label === label);
    if (match) {
      return match.path;
    }
  }

  const fallback = run.artifacts.find((artifact) => {
    const label = artifact.label.toLowerCase();
    return label.includes("dataset") || label.includes("prompt/response");
  });

  return fallback?.path ?? null;
}

export default function ImportsScreen() {
  const { openRetrievalInvestigation, setActiveScreen } = useNavigation();
  const [form, setForm] = useState<ImportJobForm>({
    mode: "single_file",
    inputFile: "C:\\Users\\Laptop\\Desktop\\AI Exports\\claude\\conversation.json",
    inputFolder: "C:\\Users\\Laptop\\Desktop\\AI Exports",
    outputRoot: "organized_output"
  });

  const [runState, setRunState] = useState<RunState>("idle");
  const [statusMessage, setStatusMessage] = useState("Ready to inspect or import.");
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
    setStatusMessage("Searching past imports...");
    try {
      const result = await searchImportHistory(form.outputRoot, filters);
      setImportHistory(result);
      setHistoryMode("query");
      setSelectedRun(result.latest);
      setLogEntries((prev) => [
        makeLogEntry("info", "History search completed: " + result.runs.length + " matching run(s)."),
        ...prev
      ]);
    } finally {
      setHistorySearchBusy(false);
    }
  }

  async function resetHistorySearch() {
    setStatusMessage("Ready to inspect or import.");
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
        "Saved search"
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
        "Saved search"
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
    setStatusMessage("Running import...");
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

  const latestRunForNextSteps = importHistory?.latest;
  const latestArchiveArtifactPath = findLatestArchiveArtifactPath(latestRunForNextSteps ?? null);
  const latestDatasetArtifactPath = findLatestDatasetArtifactPath(latestRunForNextSteps ?? null);
  const hasConversationOutputs = (latestRunForNextSteps?.conversationFilesProcessed ?? 0) > 0;
  const hasDatasetOutputs = !!latestRunForNextSteps?.retrievalSummary;
  const runNeedsDiagnostics =
    !!latestRunForNextSteps &&
    (
      latestRunForNextSteps.filesFailed > 0 ||
      latestRunForNextSteps.unsupportedFilesSkipped > 0 ||
      latestRunForNextSteps.results.some((result) => result.status !== "imported")
    );

  function nextStepSummary(run: ImportRunSummary): string {
    if (run.filesImported === 0) {
      return "This run did not produce imported files. Check the source summary and diagnostics before trying again.";
    }

    if (runNeedsDiagnostics) {
      return "The import finished, but there were skipped or failed files. Read the archive or datasets if they were produced, then check diagnostics for anything that needs attention.";
    }

    if (hasConversationOutputs) {
      return "The import finished cleanly. Open the readable archive first for the easiest review, then open datasets if you want structured output.";
    }

    return "The import finished. Open the imported outputs to review what Quantum produced from this run.";
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
        <p className="muted">
          MVP focus: inspect recognizable AI exports, import them locally, open a readable archive, and review the dataset output without leaving the app.
        </p>
        <ul>
          <li>ChatGPT and Grok are the clearest ready-now conversation import paths.</li>
          <li>Claude-style JSON, Gemini My Activity HTML, and proven Copilot activity CSV exports can still import through recovery paths when their structure is intact.</li>
          <li>Quantum inspects a file or folder first, then tells you what it can import, archive, or skip before the run starts.</li>
          <li>Conversation imports produce both a readable archive and privacy-aware dataset records in the same local run.</li>
          <li>Keep one stable output folder for related imports so history, search, and datasets stay connected.</li>
        </ul>
        <p className="muted">
          Generic documents and PDFs can still be processed, but they are supporting paths rather than the main MVP promise.
        </p>
      </div>

      <div className="panel">
        <h2>Next Step</h2>
        {!latestRunForNextSteps ? (
          <>
            <p className="muted">
              Start by inspecting a file or folder. After your first import, Quantum will point you to the best next screen.
            </p>
            <div className="action-bar">
              <button className="primary-btn" type="button" onClick={refreshSourceSummary}>
                Inspect Current Path
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="muted">{nextStepSummary(latestRunForNextSteps)}</p>
            <p className="muted">
              Latest run: {new Date(latestRunForNextSteps.runAt).toLocaleString()} | Imported {latestRunForNextSteps.filesImported} of {latestRunForNextSteps.filesDiscovered} file(s)
            </p>
            <div className="action-bar">
              {hasConversationOutputs ? (
                <button className="primary-btn" type="button" onClick={() => setActiveScreen("organized-output")}>
                  Open Readable Archive
                </button>
              ) : null}
              {latestArchiveArtifactPath ? (
                <button
                  className="secondary-btn"
                  type="button"
                  onClick={() => revealDesktopPath(latestArchiveArtifactPath)}
                >
                  Open Latest Archive File
                </button>
              ) : null}
              {hasDatasetOutputs ? (
                <button className="primary-btn" type="button" onClick={() => setActiveScreen("datasets")}>
                  Open Datasets
                </button>
              ) : null}
              {latestDatasetArtifactPath ? (
                <button
                  className="secondary-btn"
                  type="button"
                  onClick={() => revealDesktopPath(latestDatasetArtifactPath)}
                >
                  Open Latest Dataset File
                </button>
              ) : null}
              {runNeedsDiagnostics ? (
                <button className="secondary-btn" type="button" onClick={() => setActiveScreen("diagnostics")}>
                  Check Diagnostics
                </button>
              ) : null}
              {latestRunForNextSteps.retrievalSummary ? (
                <button
                  className="secondary-btn"
                  type="button"
                  onClick={() =>
                    openRetrievalInvestigation({
                      filters: {
                        text: "",
                        vendor: "",
                        topic: "",
                        status: "all",
                        from: "",
                        to: ""
                      },
                      suggestedName: latestRunForNextSteps.retrievalSummary?.topicHints[0] || "Latest import"
                    })
                  }
                >
                  Find Imported Files
                </button>
              ) : null}
            </div>
          </>
        )}
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
          <p className="muted">Inspect a file or folder to see what Quantum can import, recover, or skip before you run anything.</p>
        ) : (
          <>
            <p className="muted">
              {sourceSummary.inputType} found at <code>{sourceSummary.inputPath}</code>
            </p>
            <p className="muted">
              This summary helps you decide whether to import now, clean up the export first, or ignore files that are outside the main MVP path.
            </p>
            <div className="stats-grid two-col">
              <div className="stat-card accent-card">
                <span className="label">AI Export Files</span>
                <strong>
                  {sourceSummary.countsByKind.chatgpt_export + sourceSummary.countsByKind.conversation_json}
                    + sourceSummary.countsByKind.gemini_activity_html
                </strong>
              </div>
              <div className="stat-card">
                <span className="label">Ready To Process</span>
                <strong>{sourceSummary.supportedFiles}</strong>
              </div>
              <div className="stat-card">
                <span className="label">Will Be Skipped</span>
                <strong>{sourceSummary.unsupportedFiles}</strong>
              </div>
              <div className="stat-card subdued-card">
                <span className="label">Document Files</span>
                <strong>
                  {sourceSummary.countsByKind.text_document + sourceSummary.countsByKind.json_document}
                </strong>
              </div>
              <div className="stat-card subdued-card">
                <span className="label">PDF Files</span>
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
                      <th>Readiness</th>
                      <th>Path</th>
                      <th>What Happens If You Import</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sourceSummary.sampleFiles.map((entry) => (
                      <tr key={entry.path} className={sourceEntryRowClassName(entry.kind)}>
                        <td>{formatSourceEntryKindLabel(entry.kind)}</td>
                        <td>{formatSupportTierLabel(entry.supportTier)}</td>
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
