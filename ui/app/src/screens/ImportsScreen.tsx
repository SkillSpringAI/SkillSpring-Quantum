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
import { useSettings } from "../state/settingsContext";
import {
  countPackageCompanionSkips,
  countUnexpectedSkippedFiles,
  runNeedsAttention
} from "../utils/importTrust";

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

function formatSourceEntryKindLabel(entry: ImportSourceSummary["sampleFiles"][number]): string {
  if (entry.displayLabel?.trim()) {
    return entry.displayLabel;
  }

  const kind = entry.kind;
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

function summarizeRunOutcomeCounts(run: ImportRunSummary | null): string | null {
  if (!run) {
    return null;
  }

  const archivedOnly =
    run.archivedOnlyFiles ??
    run.results.filter(
      (result) =>
        result.metadata?.sourceCategory === "document" &&
        result.metadata.parseStatus === "binary_archived_only"
    ).length;
  const recoveryPath =
    run.recoveryPathFiles ??
    run.results.filter(
      (result) =>
        result.metadata?.sourceCategory === "conversation" &&
        result.metadata.supportTier === "mvp_compatibility_fallback"
    ).length;

  const companionSkips = countPackageCompanionSkips(run);
  const unexpectedSkips = countUnexpectedSkippedFiles(run);
  const parts = [
    run.filesImported + " imported",
    run.filesFailed + " failed",
    unexpectedSkips + " skipped"
  ];

  if (archivedOnly > 0) {
    parts.push(archivedOnly + " archived only");
  }

  if (recoveryPath > 0) {
    parts.push(recoveryPath + " recovery path");
  }

  if (companionSkips > 0) {
    parts.push(companionSkips + " package companion file(s) handled");
  }

  return parts.join(" | ");
}

function buildRecoveryGuidance(run: ImportRunSummary | null): string[] {
  if (!run) {
    return [];
  }

  const steps: string[] = [];
  const unexpectedSkips = countUnexpectedSkippedFiles(run);
  const failedFiles = run.results.filter((result) => result.status === "failed").length;
  const recoveryPathFiles =
    run.recoveryPathFiles ??
    run.results.filter(
      (result) =>
        result.metadata?.sourceCategory === "conversation" &&
        result.metadata.supportTier === "mvp_compatibility_fallback"
    ).length;

  if (failedFiles > 0) {
    steps.push("Open Diagnostics first, then check the failed file messages in Import History to see whether the export shape broke before archive and dataset output finished.");
  }

  if (unexpectedSkips > 0) {
    steps.push("Re-inspect the source path before retrying so you can confirm which files were outside the recognized import set and whether the main export file is missing.");
  }

  if (recoveryPathFiles > 0) {
    steps.push("Spot-check the readable archive and one dataset preview because recovery-path imports are useful, but they deserve a quick completeness check before you trust them like first-class exports.");
  }

  if (run.filesImported === 0) {
    steps.push("Do not keep rerunning the same path unchanged. Inspect it first, then either clean the export package up or switch to the vendor’s main export file.");
  }

  if (steps.length === 0 && countPackageCompanionSkips(run) > 0) {
    steps.push("Package companion files were handled automatically, so you can keep moving with the archive and dataset review instead of troubleshooting those skipped files.");
  }

  return steps;
}

function buildPostRunStatusMessage(run: ImportRunSummary | null, fallbackMessage: string): string {
  if (!run) {
    return fallbackMessage;
  }

  const unexpectedSkips = countUnexpectedSkippedFiles(run);
  const failedFiles = run.results.filter((result) => result.status === "failed").length;
  const recoveryPathFiles =
    run.recoveryPathFiles ??
    run.results.filter(
      (result) =>
        result.metadata?.sourceCategory === "conversation" &&
        result.metadata.supportTier === "mvp_compatibility_fallback"
    ).length;

  if (run.filesImported === 0) {
    return "Import finished without usable outputs. Re-inspect the source path and open diagnostics before retrying.";
  }

  if (failedFiles > 0 || unexpectedSkips > 0) {
    return "Import finished with issues. Review the archive or datasets if they were produced, then open diagnostics and import history before retrying.";
  }

  if (recoveryPathFiles > 0) {
    return "Import finished through a recovery path. Spot-check the archive and dataset context before treating the run like a first-class export.";
  }

  if (countPackageCompanionSkips(run) > 0) {
    return "Import finished cleanly. Vendor package companion files were handled automatically, so you can move straight into archive and dataset review.";
  }

  return "Import finished cleanly. Open the readable archive first, then use datasets if you want structured output.";
}

export default function ImportsScreen() {
  const { openRetrievalInvestigation, setActiveScreen } = useNavigation();
  const { settings, updateSettings } = useSettings();
  const [form, setForm] = useState<ImportJobForm>({
    mode: "single_file",
    inputFile: "",
    inputFolder: "",
    outputRoot: settings.outputRoot
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
    return result;
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
    updateSettings({ outputRoot: nextPath });
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
      const refreshedHistory = await refreshImportHistory();
      setRunState("success");
      setStatusMessage(buildPostRunStatusMessage(refreshedHistory.latest, result.message));
      setLogEntries((prev) => [
        makeLogEntry("success", buildPostRunStatusMessage(refreshedHistory.latest, result.message)),
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

  useEffect(() => {
    refreshImportHistory();
    refreshArchiveNotifications();
  }, [form.outputRoot]);

  const latestRunForNextSteps = importHistory?.latest;
  const latestArchiveArtifactPath = findLatestArchiveArtifactPath(latestRunForNextSteps ?? null);
  const latestDatasetArtifactPath = findLatestDatasetArtifactPath(latestRunForNextSteps ?? null);
  const latestRunOutcomeSummary = summarizeRunOutcomeCounts(latestRunForNextSteps ?? null);
  const hasConversationOutputs = (latestRunForNextSteps?.conversationFilesProcessed ?? 0) > 0;
  const hasDatasetOutputs = !!latestRunForNextSteps?.retrievalSummary;
  const latestPackageCompanionSkips = countPackageCompanionSkips(latestRunForNextSteps ?? null);
  const runNeedsDiagnostics = runNeedsAttention(latestRunForNextSteps ?? null);
  const recoveryGuidance = buildRecoveryGuidance(latestRunForNextSteps ?? null);

  function nextStepSummary(run: ImportRunSummary): string {
    if (run.filesImported === 0) {
      return "This run did not produce imported files. Check the source summary and diagnostics before trying again.";
    }

    if (runNeedsDiagnostics) {
      return "The import finished, but there were skipped or failed files. Read the archive or datasets if they were produced, then check diagnostics for anything that needs attention.";
    }

    if (latestPackageCompanionSkips > 0) {
      return "The import finished cleanly. Quantum handled the vendor package through its main import file and kept companion files out of the dataset flow automatically.";
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
          <li>Claude exports, Gemini My Activity HTML, and proven Microsoft Copilot activity CSV exports can still import through recovery paths when their structure is intact.</li>
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
              Latest run: {new Date(latestRunForNextSteps.runAt).toLocaleString()} | {latestRunOutcomeSummary}
            </p>
            {latestPackageCompanionSkips > 0 ? (
              <p className="muted">
                Vendor package note: {latestPackageCompanionSkips} companion file(s) were expected and were handled through the main package import instead of being added as separate dataset sources.
              </p>
            ) : null}
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

      <div className="panel">
        <h2>Recovery Guidance</h2>
        {!latestRunForNextSteps ? (
          <p className="muted">
            After your first import, Quantum will explain whether you can move straight to archive and datasets or whether a failed, skipped, or recovery-path result needs a quick check first.
          </p>
        ) : recoveryGuidance.length === 0 ? (
          <p className="muted">
            This run does not need special recovery steps. You can keep moving into archive review and dataset review.
          </p>
        ) : (
          <>
            <p className="muted">
              Use these checks before retrying an import or treating every record in this run as fully reliable.
            </p>
            <ul>
              {recoveryGuidance.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
            <div className="action-bar">
              <button className="secondary-btn" type="button" onClick={refreshSourceSummary}>
                Re-Inspect Current Path
              </button>
              {runNeedsDiagnostics ? (
                <button className="secondary-btn" type="button" onClick={() => setActiveScreen("diagnostics")}>
                  Open Diagnostics
                </button>
              ) : null}
              {hasConversationOutputs ? (
                <button className="secondary-btn" type="button" onClick={() => setActiveScreen("organized-output")}>
                  Review Archive
                </button>
              ) : null}
              {hasDatasetOutputs ? (
                <button className="secondary-btn" type="button" onClick={() => setActiveScreen("datasets")}>
                  Review Dataset Context
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
                        <td>{formatSourceEntryKindLabel(entry)}</td>
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
