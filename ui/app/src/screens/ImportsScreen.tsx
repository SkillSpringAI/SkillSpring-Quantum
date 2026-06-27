import { useEffect, useState } from "react";
import ImportForm from "../components/ImportForm";
import ImportHistoryPanel from "../components/ImportHistoryPanel";
import RunStatusPanel from "../components/RunStatusPanel";
import RunLogPanel from "../components/RunLogPanel";
import ArchiveNotificationPanel from "../components/ArchiveNotificationPanel";
import type {
  ImportJobForm,
  ImportSourceSummary,
  ImportSourceVendorSummary,
  ImportVendorChoice,
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
import { desktopBridgeAvailable } from "../services/desktopBridge";
import { loadImportHistory, searchImportHistory } from "../services/importHistoryBridge";
import { loadArchiveNotifications } from "../services/archiveNotificationsBridge";
import OpenPathButton from "../components/OpenPathButton";
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

function formatVendorSummaryLabel(vendor: ImportSourceVendorSummary["vendor"]): string {
  switch (vendor) {
    case "chatgpt":
      return "ChatGPT";
    case "grok":
      return "Grok";
    case "claude":
      return "Claude";
    case "gemini":
      return "Gemini";
    case "copilot":
      return "Microsoft Copilot";
    default:
      return "Recovered JSON";
  }
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
    steps.push("Spot-check the readable archive and one dataset preview because recovery-path imports are useful, but they still deserve a quick completeness check before you treat them like fully clean exports.");
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
  const [showImportHelp, setShowImportHelp] = useState(false);
  const [showSourceDetails, setShowSourceDetails] = useState(false);
  const [showRecoveryGuidance, setShowRecoveryGuidance] = useState(false);
  const [showImportHistoryDetails, setShowImportHistoryDetails] = useState(false);
  const [showCheckResults, setShowCheckResults] = useState(false);
  const [showRunLog, setShowRunLog] = useState(false);
  const [form, setForm] = useState<ImportJobForm>({
    mode: "single_file",
    expectedVendor: "auto_detect",
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

    try {
      const result = await inspectSourcePath(sourcePath);
      setSourceSummary(result);

      if (result) {
        setStatusMessage("Source path checked.");
        setLogEntries((prev) => [
          makeLogEntry(
            "info",
            "Inspected source path: " + result.supportedFiles + " supported file(s), " + result.unsupportedFiles + " unsupported."
          ),
          ...prev
        ]);
      }
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "Desktop bridge unavailable. Relaunch SkillSpring Quantum through Electron so real file inspection and imports can run.";
      setSourceSummary(null);
      setRunState("failed");
      setStatusMessage(message);
      setLogEntries((prev) => [
        makeLogEntry("error", message),
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

  useEffect(() => {
    if (!desktopBridgeAvailable()) {
      const message = "Desktop bridge unavailable. Relaunch SkillSpring Quantum through Electron so real file inspection and imports can run.";
      setStatusMessage(message);
      setLogEntries((prev) => [makeLogEntry("error", message), ...prev]);
    }
  }, []);

  const latestRunForNextSteps = importHistory?.latest;
  const latestArchiveArtifactPath = findLatestArchiveArtifactPath(latestRunForNextSteps ?? null);
  const latestDatasetArtifactPath = findLatestDatasetArtifactPath(latestRunForNextSteps ?? null);
  const latestRunOutcomeSummary = summarizeRunOutcomeCounts(latestRunForNextSteps ?? null);
  const hasConversationOutputs = (latestRunForNextSteps?.conversationFilesProcessed ?? 0) > 0;
  const hasDatasetOutputs = !!latestRunForNextSteps?.retrievalSummary;
  const latestPackageCompanionSkips = countPackageCompanionSkips(latestRunForNextSteps ?? null);
  const runNeedsDiagnostics = runNeedsAttention(latestRunForNextSteps ?? null);
  const recoveryGuidance = buildRecoveryGuidance(latestRunForNextSteps ?? null);
  const showHistoryPanel = Boolean(importHistory?.runs.length || importHistory?.latest || historyMode === "query");
  const showArchivePanel = Boolean(latestArchive || archiveEvents.length > 0);
  const expectedVendorSummary = findExpectedVendorSummary(sourceSummary, form.expectedVendor);
  const expectedVendorMessage = buildExpectedVendorMessage(sourceSummary, form.expectedVendor);
  const validationCard = buildValidationCard(sourceSummary, form.expectedVendor);
  const showSourceResults = sourceSummary !== null;
  const showFirstUseResultsPlaceholder = !showSourceResults && !showHistoryPanel && !showArchivePanel;

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

      {showArchivePanel ? (
        <ArchiveNotificationPanel
          latest={latestArchive}
          events={archiveEvents}
          onRefresh={refreshArchiveNotifications}
        />
      ) : (
        <div className="panel">
          <h2>After Import</h2>
          <p className="muted">
            Your readable archive updates will appear here after the first successful import.
          </p>
        </div>
      )}

      <div className="panel">
        <h2>Before You Import</h2>
        <p className="muted">
          Start with the export you actually downloaded. Quantum will check whether this path looks ready before it imports anything.
        </p>
        <div className="action-bar">
          <button className="secondary-btn" type="button" onClick={() => setShowImportHelp((value) => !value)}>
            {showImportHelp ? "Hide Steps" : "Show Steps"}
          </button>
        </div>
        {showImportHelp ? (
          <ul>
            <li>Pick the vendor first so Quantum knows which export shape to look for.</li>
            <li>Use the downloaded folder when the export came as a package, not just a single file.</li>
            <li>Run the check first. If it looks good, import from the same path without changing anything.</li>
            <li>After import, start in Readable Archive. Open Structured View only when you want structured output.</li>
          </ul>
        ) : null}
      </div>

      <div className="panel">
        <h2>Export Check</h2>
        {!sourceSummary ? (
          <>
            <p className="muted">
              Pick a vendor and export path, then use <strong>Check This Export</strong> before you import.
            </p>
            <p className="muted">{buildPreInspectVendorHint(form.expectedVendor)}</p>
          </>
        ) : (
          <>
            <div className={validationCard.toneClass + " match-card"}>
              <span className="match-card-kicker">{validationCard.kicker}</span>
              <strong>{validationCard.title}</strong>
              <p className="muted">{expectedVendorMessage}</p>
              <p className="muted">{buildValidationNextStep(sourceSummary, form.expectedVendor)}</p>
              <div className="signal-badge-row">
                <span
                  className={
                    validationCard.state === "ready"
                      ? "signal-badge success"
                      : validationCard.state === "caution"
                        ? "signal-badge warning"
                        : validationCard.state === "mismatch"
                          ? "signal-badge warning"
                          : "signal-badge"
                  }
                >
                  {validationCard.badge}
                </span>
                <span className="signal-badge">
                  {sourceSummary.supportedFiles} ready
                </span>
                {sourceSummary.unsupportedFiles > 0 ? (
                  <span className="signal-badge">
                    {sourceSummary.unsupportedFiles} skipped
                  </span>
                ) : null}
              </div>
              {expectedVendorSummary ? (
                <p className="muted">
                  {formatVendorSummaryLabel(expectedVendorSummary.vendor)} readiness: {formatSupportTierLabel(expectedVendorSummary.supportTier)} | {expectedVendorSummary.detectedFiles} main import file(s)
                  {expectedVendorSummary.companionFiles > 0 ? ` | ${expectedVendorSummary.companionFiles} companion file(s)` : ""}
                </p>
              ) : null}
            </div>
            <div className="action-bar">
              <button className="primary-btn" type="button" onClick={refreshSourceSummary}>
                Check Current Path Again
              </button>
              {sourceSummary.supportedFiles > 0 ? (
                <button className="secondary-btn" type="button" onClick={handleSubmit}>
                  Import This Path
                </button>
              ) : null}
            </div>
          </>
        )}
      </div>

      {latestRunForNextSteps ? (
        <div className="panel">
          <h2>Next Step</h2>
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
            {hasDatasetOutputs ? (
              <button className="primary-btn" type="button" onClick={() => setActiveScreen("datasets")}>
                Open Structured View
              </button>
            ) : null}
            {runNeedsDiagnostics ? (
              <button className="secondary-btn" type="button" onClick={() => setActiveScreen("diagnostics")}>
                Check Diagnostics
              </button>
            ) : null}
            {latestArchiveArtifactPath ? (
              <OpenPathButton className="secondary-btn" targetPath={latestArchiveArtifactPath}>
                Open Latest Archive File
              </OpenPathButton>
            ) : null}
            {latestDatasetArtifactPath ? (
              <OpenPathButton className="secondary-btn" targetPath={latestDatasetArtifactPath}>
                Open Latest Dataset File
              </OpenPathButton>
            ) : null}
          </div>
        </div>
      ) : null}

      {latestRunForNextSteps && recoveryGuidance.length > 0 ? (
        <div className="panel">
          <h2>Check Before You Move On</h2>
          <p className="muted">
            This run deserves a closer spot-check before you rely on every output.
          </p>
          <div className="action-bar">
            <button
              className="secondary-btn"
              type="button"
              onClick={() => setShowRecoveryGuidance((value) => !value)}
            >
              {showRecoveryGuidance ? "Hide What To Check" : "Show What To Check"}
            </button>
            <button className="secondary-btn" type="button" onClick={refreshSourceSummary}>
              Re-Check Path
            </button>
            {runNeedsDiagnostics ? (
              <button className="secondary-btn" type="button" onClick={() => setActiveScreen("diagnostics")}>
                Open Diagnostics
              </button>
            ) : null}
          </div>
          {showRecoveryGuidance ? (
            <ul>
              {recoveryGuidance.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="panel large">
        <h2>Import History</h2>
        {showHistoryPanel ? (
          <>
            <p className="muted">
              Keep this collapsed unless you want to compare runs, search past imports, or hand a specific result into Find Imports.
            </p>
            <div className="action-bar">
              <button
                className="secondary-btn"
                type="button"
                onClick={() => setShowImportHistoryDetails((value) => !value)}
              >
                {showImportHistoryDetails ? "Hide Import History" : "Show Import History"}
              </button>
            </div>
            {showImportHistoryDetails ? (
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
            ) : null}
          </>
        ) : (
          <p className="muted">
            Recent imports will appear here after the first successful run.
          </p>
        )}
      </div>

      {showSourceResults ? (
        <div className="panel large">
          <h2>Export Check Results</h2>
          <p className="muted">
            {sourceSummary.inputType} found at <code>{sourceSummary.inputPath}</code>
          </p>
          <p className="muted">
            {buildSourceSummaryLead(sourceSummary)}
          </p>
          <div className="stats-grid two-col">
            <div className="stat-card accent-card">
              <span className="label">Main Export Files</span>
              <strong>
                {sourceSummary.countsByKind.chatgpt_export + sourceSummary.countsByKind.conversation_json}
                  + sourceSummary.countsByKind.gemini_activity_html
              </strong>
              <p className="muted">Recognized conversation export files in this path.</p>
            </div>
            <div className="stat-card">
              <span className="label">Import-Ready</span>
              <strong>{sourceSummary.supportedFiles}</strong>
              <p className="muted">Files Quantum can import from this path right now.</p>
            </div>
            <div className="stat-card">
              <span className="label">Not Used</span>
              <strong>{sourceSummary.unsupportedFiles}</strong>
              <p className="muted">Files Quantum will ignore because they are outside the current import lane.</p>
            </div>
            <div className="stat-card subdued-card">
              <span className="label">Extra Files Nearby</span>
              <strong>
                {sourceSummary.countsByKind.text_document + sourceSummary.countsByKind.json_document}
              </strong>
              <p className="muted">Extra documents found next to the main export.</p>
            </div>
          </div>
          <div className="action-bar">
            <button className="secondary-btn" type="button" onClick={() => setShowCheckResults((value) => !value)}>
              {showCheckResults ? "Hide File-by-File Results" : "Show File-by-File Results"}
            </button>
          </div>
          {showCheckResults ? (
            <>
              <div className="stats-grid two-col">
                <div className="stat-card subdued-card">
                  <span className="label">PDF Files</span>
                  <strong>{sourceSummary.countsByKind.pdf_document}</strong>
                  <p className="muted">PDFs found in the selected path.</p>
                </div>
                <div className="stat-card">
                  <span className="label">Total Files</span>
                  <strong>{sourceSummary.totalFiles}</strong>
                  <p className="muted">Everything Quantum saw in the selected file or folder.</p>
                </div>
              </div>
              <div className="action-bar">
                <button className="secondary-btn" type="button" onClick={() => setShowSourceDetails((value) => !value)}>
                  {showSourceDetails ? "Hide File Details" : "Show File Details"}
                </button>
              </div>
              {showSourceDetails ? (
                <>
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
                  {sourceSummary.vendorSummaries.length > 0 ? (
                    <>
                      <p className="muted">
                        This is Quantum's best guess about which export this path most closely matches.
                      </p>
                      <div className="stats-grid two-col">
                        {sourceSummary.vendorSummaries.map((summary) => (
                          <div
                            key={summary.vendor}
                            className={
                              "stat-card" +
                              (isExpectedVendor(form.expectedVendor, summary.vendor) ? " vendor-match-card" : "") +
                              (shouldDimVendorCard(form.expectedVendor, summary.vendor) ? " subdued-card" : "")
                            }
                          >
                            <span className="label">{formatVendorSummaryLabel(summary.vendor)}</span>
                            <strong>{formatSupportTierLabel(summary.supportTier)}</strong>
                            <p className="muted">
                              {summary.detectedFiles} main import file(s) detected
                              {summary.companionFiles > 0 ? ` | ${summary.companionFiles} companion file(s)` : ""}
                            </p>
                            {isExpectedVendor(form.expectedVendor, summary.vendor) ? (
                              <p className="muted">Matches the vendor you selected above.</p>
                            ) : null}
                            <p className="muted">{summary.recommendation}</p>
                          </div>
                        ))}
                      </div>
                    </>
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
              ) : null}
            </>
          ) : null}
        </div>
      ) : showFirstUseResultsPlaceholder ? (
        <div className="panel large">
          <h2>What To Do Next</h2>
          <ul className="list">
            <li>Choose the export source you want to import.</li>
            <li>Browse to the downloaded file or folder.</li>
            <li>Run the export check and look for a ready or caution result.</li>
            <li>Import from the same path when it looks right.</li>
          </ul>
        </div>
      ) : null}

      <div className="panel large">
        <h2>Activity Log</h2>
        <p className="muted">
          Keep this closed unless you are debugging a failed check or import run.
        </p>
        <div className="action-bar">
          <button className="secondary-btn" type="button" onClick={() => setShowRunLog((value) => !value)}>
            {showRunLog ? "Hide Activity Log" : "Show Activity Log"}
          </button>
        </div>
        {showRunLog ? <RunLogPanel entries={logEntries} /> : null}
      </div>
    </section>
  );
}

function findExpectedVendorSummary(
  sourceSummary: ImportSourceSummary | null,
  expectedVendor: ImportVendorChoice
): ImportSourceVendorSummary | null {
  if (!sourceSummary || expectedVendor === "auto_detect") {
    return null;
  }

  return sourceSummary.vendorSummaries.find((summary) => summary.vendor === expectedVendor) ?? null;
}

function buildPreInspectVendorHint(expectedVendor: ImportVendorChoice): string {
  switch (expectedVendor) {
    case "chatgpt":
      return "ChatGPT usually arrives as a folder export. Start with the downloaded folder unless you only have the main export file.";
    case "claude":
      return "Claude exports are easiest to validate from the full downloaded folder.";
    case "grok":
      return "Grok is best checked from the whole export folder so attached files and supporting records stay connected.";
    case "gemini":
      return "Gemini often arrives as a folder. Start there so Quantum can see the full export shape.";
    case "copilot":
      return "Copilot is strongest when you point Quantum at the activity CSV file directly.";
    default:
      return "Auto Detect works best when you have a mixed exports folder and want Quantum to identify the vendor package for you.";
  }
}

function buildExpectedVendorMessage(
  sourceSummary: ImportSourceSummary | null,
  expectedVendor: ImportVendorChoice
): string {
  if (!sourceSummary) {
    return "No export has been checked yet.";
  }

  if (expectedVendor === "auto_detect") {
    return sourceSummary.supportedFiles > 0
      ? `Quantum found ${sourceSummary.supportedFiles} importable file(s) in this path.`
      : "Quantum did not find a usable export in this path yet.";
  }

  const match = sourceSummary.vendorSummaries.find((summary) => summary.vendor === expectedVendor);
  if (!match) {
    return `This path does not currently look like a ${EXPECTED_VENDOR_LABELS[expectedVendor]} export Quantum recognizes.`;
  }

  if (match.supportTier === "mvp_first_class") {
    return `This path looks like a ${EXPECTED_VENDOR_LABELS[expectedVendor]} export and is ready for the normal import path.`;
  }

  if (match.supportTier === "mvp_compatibility_fallback") {
    return `This path looks like a ${EXPECTED_VENDOR_LABELS[expectedVendor]} export, but it will use a recovery path and deserves a quick spot-check after import.`;
  }

  return `Quantum found ${EXPECTED_VENDOR_LABELS[expectedVendor]} clues here, but this path is not the best version of that export yet.`;
}

const EXPECTED_VENDOR_LABELS: Record<Exclude<ImportVendorChoice, "auto_detect">, string> = {
  chatgpt: "ChatGPT",
  claude: "Claude",
  grok: "Grok",
  gemini: "Gemini",
  copilot: "Microsoft Copilot"
};

function buildValidationCard(
  sourceSummary: ImportSourceSummary | null,
  expectedVendor: ImportVendorChoice
): { title: string; toneClass: string; state: "idle" | "ready" | "caution" | "mismatch"; kicker: string; badge: string } {
  if (!sourceSummary) {
    return {
      title: "Ready to check",
      toneClass: "detail-box",
      state: "idle",
      kicker: "No export checked",
      badge: "check required"
    };
  }

  if (expectedVendor === "auto_detect") {
    return sourceSummary.supportedFiles > 0
      ? { title: "Usable export found", toneClass: "context-tip", state: "ready", kicker: "Check result", badge: "ready now" }
      : { title: "No usable export found yet", toneClass: "warning-box", state: "mismatch", kicker: "Check result", badge: "not ready" };
  }

  const match = sourceSummary.vendorSummaries.find((summary) => summary.vendor === expectedVendor);
  if (!match) {
    return {
      title: "Vendor mismatch",
      toneClass: "warning-box",
      state: "mismatch",
      kicker: "Check result",
      badge: "vendor mismatch"
    };
  }

  if (match.supportTier === "mvp_first_class") {
    return {
      title: "Ready to import",
      toneClass: "context-tip",
      state: "ready",
      kicker: "Check result",
      badge: "ready now"
    };
  }

  if (match.supportTier === "mvp_compatibility_fallback") {
    return {
      title: "Usable with caution",
      toneClass: "warning-box",
      state: "caution",
      kicker: "Check result",
      badge: "recovery path"
    };
  }

  return {
    title: "Detected, but not in the best shape yet",
    toneClass: "warning-box",
    state: "caution",
    kicker: "Check result",
    badge: "partial match"
  };
}

function buildValidationNextStep(
  sourceSummary: ImportSourceSummary | null,
  expectedVendor: ImportVendorChoice
): string {
  if (!sourceSummary) {
    return "Pick a path and run the check first.";
  }

  if (sourceSummary.supportedFiles === 0) {
    return "Try the downloaded export folder or switch the selected vendor before importing.";
  }

  if (expectedVendor === "auto_detect") {
    return "If this is the folder you meant to import, you can keep this path and run the import.";
  }

  const match = sourceSummary.vendorSummaries.find((summary) => summary.vendor === expectedVendor);
  if (!match) {
    return "Switch to the vendor that matches this folder, or browse to a different export before importing.";
  }

  if (match.supportTier === "mvp_first_class") {
    return "This looks good. If this is the export you meant to use, import from this same path.";
  }

  if (match.supportTier === "mvp_compatibility_fallback") {
    return "You can still import this path, but plan to review the archive and one dataset preview afterward.";
  }

  return "This path was partly recognized, but it is safer to browse to the downloaded export root before importing.";
}

function buildSourceSummaryLead(sourceSummary: ImportSourceSummary): string {
  if (sourceSummary.supportedFiles === 0) {
    return "Quantum did not find a usable main export in this path yet.";
  }

  if (sourceSummary.supportedFiles === 1 && sourceSummary.unsupportedFiles === 0) {
    return "Quantum found one clean import candidate in this path.";
  }

  if (sourceSummary.unsupportedFiles === 0) {
    return `Quantum found ${sourceSummary.supportedFiles} importable file(s) here and nothing extra that needs to be skipped.`;
  }

  return `Quantum found ${sourceSummary.supportedFiles} importable file(s) here and will ignore ${sourceSummary.unsupportedFiles} file(s) that are outside the current import lane.`;
}

function isExpectedVendor(
  expectedVendor: ImportVendorChoice,
  vendor: ImportSourceVendorSummary["vendor"]
): boolean {
  return expectedVendor !== "auto_detect" && expectedVendor === vendor;
}

function shouldDimVendorCard(
  expectedVendor: ImportVendorChoice,
  vendor: ImportSourceVendorSummary["vendor"]
): boolean {
  return expectedVendor !== "auto_detect" && expectedVendor !== vendor;
}
