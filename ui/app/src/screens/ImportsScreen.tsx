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
  const showHistoryPanel = Boolean(importHistory?.runs.length || importHistory?.latest || historyMode === "query");
  const expectedVendorSummary = findExpectedVendorSummary(sourceSummary, form.expectedVendor);
  const expectedVendorMessage = buildExpectedVendorMessage(sourceSummary, form.expectedVendor);
  const validationCard = buildValidationCard(sourceSummary, form.expectedVendor);

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
        <h2>What Quantum Expects</h2>
        <p className="muted">
          Quantum works best when you point it at the export you actually downloaded, then let it confirm the shape before import.
        </p>
        <ul>
          <li>Most major AI exports are easiest to validate from their downloaded folder.</li>
          <li>Quantum checks the export shape first, then tells you whether it looks ready-now, recovery-path, or unsupported.</li>
          <li>A successful conversation import produces both a readable archive and privacy-aware datasets in the same local run.</li>
        </ul>
      </div>

      <div className="panel">
        <h2>Match Check</h2>
        {!sourceSummary ? (
          <>
            <p className="muted">
              Pick a vendor and export path, then use <strong>Check Match</strong> before you import.
            </p>
            <p className="muted">{buildPreInspectVendorHint(form.expectedVendor)}</p>
          </>
        ) : (
          <>
            <div className={validationCard.toneClass}>
              <strong>{validationCard.title}</strong>
              <p className="muted">{expectedVendorMessage}</p>
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
                Open Datasets
              </button>
            ) : null}
            {runNeedsDiagnostics ? (
              <button className="secondary-btn" type="button" onClick={() => setActiveScreen("diagnostics")}>
                Check Diagnostics
              </button>
            ) : null}
            {latestArchiveArtifactPath ? (
              <button className="secondary-btn" type="button" onClick={() => revealDesktopPath(latestArchiveArtifactPath)}>
                Open Latest Archive File
              </button>
            ) : null}
            {latestDatasetArtifactPath ? (
              <button className="secondary-btn" type="button" onClick={() => revealDesktopPath(latestDatasetArtifactPath)}>
                Open Latest Dataset File
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {latestRunForNextSteps && recoveryGuidance.length > 0 ? (
        <div className="panel">
          <h2>Needs Attention</h2>
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
              Re-Check Path
            </button>
            {runNeedsDiagnostics ? (
              <button className="secondary-btn" type="button" onClick={() => setActiveScreen("diagnostics")}>
                Open Diagnostics
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {showHistoryPanel ? (
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
      ) : (
        <div className="panel large">
          <h2>Import History</h2>
          <p className="muted">
            Your recent imports will appear here after the first successful run.
          </p>
        </div>
      )}

      <div className="panel large">
        <h2>Source Summary</h2>
        {!sourceSummary ? (
          <p className="muted">Use Check Match to confirm that the selected export path looks like the vendor you intended to import.</p>
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
            {sourceSummary.vendorSummaries.length > 0 ? (
              <>
                <p className="muted">
                  Vendor readiness shows which detected exports are inside the strongest MVP lane versus which ones still need recovery-path caution.
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
        )}
      </div>

      <RunLogPanel entries={logEntries} />
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
      return "ChatGPT usually arrives as a folder export. Start with the downloaded folder unless you only have the core export file.";
    case "claude":
      return "Claude exports are easiest to validate from the full folder so companion files can be recognized as expected package parts.";
    case "grok":
      return "Grok is best checked from the whole export folder so manifests and preserved attachments stay connected.";
    case "gemini":
      return "Gemini often arrives as a folder. Quantum will tell you whether it matches the ready-now JSON path or a narrower fallback route.";
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
      : "Quantum did not find an importable export in this path yet.";
  }

  const match = sourceSummary.vendorSummaries.find((summary) => summary.vendor === expectedVendor);
  if (!match) {
    return `This path does not currently look like a ${EXPECTED_VENDOR_LABELS[expectedVendor]} export Quantum recognizes cleanly.`;
  }

  if (match.supportTier === "mvp_first_class") {
    return `This path looks like a ${EXPECTED_VENDOR_LABELS[expectedVendor]} export in Quantum's strongest supported lane.`;
  }

  if (match.supportTier === "mvp_compatibility_fallback") {
    return `This path looks like a ${EXPECTED_VENDOR_LABELS[expectedVendor]} export, but it will use a recovery path and deserves a quick spot-check after import.`;
  }

  return `Quantum found ${EXPECTED_VENDOR_LABELS[expectedVendor]} clues here, but this path is not in the strongest supported shape yet.`;
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
): { title: string; toneClass: string } {
  if (!sourceSummary) {
    return {
      title: "Ready to check",
      toneClass: "detail-box"
    };
  }

  if (expectedVendor === "auto_detect") {
    return sourceSummary.supportedFiles > 0
      ? { title: "Importable export found", toneClass: "context-tip" }
      : { title: "No supported export found yet", toneClass: "warning-box" };
  }

  const match = sourceSummary.vendorSummaries.find((summary) => summary.vendor === expectedVendor);
  if (!match) {
    return {
      title: "Vendor mismatch",
      toneClass: "warning-box"
    };
  }

  if (match.supportTier === "mvp_first_class") {
    return {
      title: "Strong match",
      toneClass: "context-tip"
    };
  }

  if (match.supportTier === "mvp_compatibility_fallback") {
    return {
      title: "Usable with caution",
      toneClass: "warning-box"
    };
  }

  return {
    title: "Detected, but not in the strongest lane",
    toneClass: "warning-box"
  };
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
