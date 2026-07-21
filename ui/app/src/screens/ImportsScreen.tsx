import { useEffect, useState } from "react";
import ImportForm from "../components/ImportForm";
import ImportHistoryPanel from "../components/ImportHistoryPanel";
import RunStatusPanel from "../components/RunStatusPanel";
import RunLogPanel from "../components/RunLogPanel";
import ArchiveNotificationPanel from "../components/ArchiveNotificationPanel";
import type {
  ImportJobForm,
  ImportMode,
  ImportProgressUpdate,
  ImportSourceSummary,
  ImportSourceVendorSummary,
  ImportVendorChoice,
  RunState,
  ImportSupportTier
} from "../types/imports";
import type { ArchiveNotification } from "../types/notifications";
import {
  activeImportPath,
  chooseFolder,
  chooseImportFile,
  inspectSourcePath,
  stopImportJob,
  submitImportJob,
  updateActiveImportPath
} from "../services/importBridge";
import { desktopBridgeAvailable } from "../services/desktopBridge";
import { loadImportHistory, searchImportHistory } from "../services/importHistoryBridge";
import { loadArchiveNotifications } from "../services/archiveNotificationsBridge";
import OpenPathButton from "../components/OpenPathButton";
import type { ImportHistoryFilters, ImportHistoryResult, ImportRunSummary } from "../types/importHistory";
import { useNavigation } from "../state/navigationContext";
import { useAgentContext } from "../state/agentContext";
import { useSettings } from "../state/settingsContext";
import { useImportActivity } from "../state/importActivityContext";
import {
  countPackageCompanionSkips,
  countPreviouslyImportedSkips,
  countUnexpectedSkippedFiles,
  runHasUsableConversationOutputs,
  runHasUsableDatasetOutputs,
  runNeedsAttention
} from "../utils/importTrust";

const IMPORT_FORM_DRAFT_KEY = "skillspring-quantum-import-form-draft";
const LEGACY_IMPORT_FORM_DRAFT_KEY = "skillspring-quantum-import-form-draft";
const SOURCE_SUMMARY_DRAFT_KEY = "skillspring-quantum-source-summary-draft";

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
  const previouslyImported = countPreviouslyImportedSkips(run);
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

  if (previouslyImported > 0) {
    parts.push(previouslyImported + " already imported");
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
  const previouslyImported = countPreviouslyImportedSkips(run);

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
    if (previouslyImported > 0) {
      steps.push("Quantum recognized files that were already imported successfully in this output folder, so you can keep using the existing archive and dataset outputs here instead of rerunning the same export unchanged.");
      return steps;
    }
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
  const previouslyImported = countPreviouslyImportedSkips(run);

  if (run.filesImported === 0) {
    if (previouslyImported > 0) {
      return "Import finished quickly. Quantum recognized files that were already imported successfully in this output folder, so it reused the existing archive and dataset outputs here instead of processing them again. Open Readable Archive, Datasets, or the current output folder to keep working from the existing results.";
    }
    return "Import finished without usable outputs. Re-inspect the source path and open diagnostics before retrying.";
  }

  if (failedFiles > 0 || unexpectedSkips > 0) {
    return "Import finished with issues. Review the archive or datasets if they were produced, then open diagnostics and import history before retrying.";
  }

  if (recoveryPathFiles > 0) {
    return "Import finished with a fallback path. Spot-check the archive and dataset view before treating this run like a clean standard import.";
  }

  if (countPackageCompanionSkips(run) > 0) {
    return "Import finished cleanly. Vendor package companion files were handled automatically, so you can move straight into archive and dataset review.";
  }

  return "Import finished cleanly. Open Readable Archive first, then use Datasets when you want the structured version.";
}

function buildOutputRootScopeHint(outputRoot: string): string {
  const outputLabel = describeOutputRoot(outputRoot);
  return `Import history, reuse checks, and already-imported acknowledgement are scoped to output ${outputLabel}. If you switch output roots, Quantum treats that as a different local workspace until that folder builds its own history.`;
}

function sourceSummaryHasLegacyChatGptBundle(sourceSummary: ImportSourceSummary | null): boolean {
  if (!sourceSummary) {
    return false;
  }

  return sourceSummary.notes.some((note) => note.toLowerCase().includes("legacy chatgpt chat bundle"));
}

function buildLegacyChatGptLaneHint(sourceSummary: ImportSourceSummary | null, runState: RunState): string | null {
  if (!sourceSummaryHasLegacyChatGptBundle(sourceSummary)) {
    return null;
  }

  if (runState === "running") {
    return "Quantum is currently on the older ChatGPT chat.html lane. If you realize this is the wrong export path, use Force Stop Import, switch paths, and re-check before starting again.";
  }

  return "This path uses the older ChatGPT chat.html lane. If that is not the export you meant to use, switch paths now instead of starting a heavier import by accident.";
}

function buildWorkspaceAvailabilityHint(
  outputRoot: string,
  latestRun: ImportRunSummary | null
): string {
  const outputLabel = describeOutputRoot(outputRoot);
  if (!latestRun) {
    return `Output ${outputLabel} does not have import history yet. If you just switched output roots, that is expected until this workspace has its own runs.`;
  }

  return `Output ${outputLabel} already has import history available, so rerun reuse and latest-run follow-up will be based on this workspace. If you are looking for work Quantum already processed, open this output folder or the latest archive and dataset shortcuts below instead of re-importing first.`;
}

function formatProgressElapsed(elapsedMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s elapsed` : `${seconds}s elapsed`;
}

function formatProgressStateLabel(update: ImportProgressUpdate): string {
  switch (update.processingState) {
    case "preparing_files":
      return "preparing";
    case "verifying_previous_output":
      return "verifying previous output";
    case "processing_new_file":
      return "processing new file";
    case "revalidating_previous_file":
      return "rechecking older output";
    case "reusing_completed_file":
      return "reusing completed file";
    case "retrying_failed_file":
      return "retrying remaining file";
    case "resuming_interrupted_shard":
      return "resuming saved checkpoint";
    case "writing_history":
      return "writing import history";
    case "writing_indexes":
      return "updating indexes";
    case "writing_outputs":
      return "writing outputs";
    default:
      return update.stage.replace(/_/g, " ");
  }
}

function buildRunningExpectation(update: ImportProgressUpdate): string | null {
  switch (update.processingState) {
    case "verifying_previous_output":
      return "ETA is still unknown here because Quantum is deciding what can be safely reused, retried, or resumed before the heaviest work begins.";
    case "processing_new_file":
      return update.currentKind === "chatgpt_export" || update.currentKind === "conversation_json" || update.currentKind === "gemini_activity_html"
        ? "Large conversation files can stay on one step for a while. Elapsed time is more trustworthy here than a guessed finish time."
        : "Quantum is doing fresh work on this file now.";
    case "revalidating_previous_file":
      return "Quantum found older output for this file, but it is refreshing verification before it trusts reuse on this run. Previously preserved output stays in place during this check.";
    case "retrying_failed_file":
      return "This can be the longest step on a heavy rerun. Exact ETA is unknown, but previously preserved output stays intact while Quantum retries only the remaining file.";
    case "resuming_interrupted_shard":
      return "Checkpointed conversations are already preserved. Quantum is continuing from the last saved checkpoint instead of starting the shard over, so elapsed time matters more than any guessed ETA.";
    case "reusing_completed_file":
      return "This part should move faster than a cold import because Quantum already verified the preserved output.";
    case "writing_history":
      return "Main file processing is done. Quantum is recording this run so the preserved and newly written output can be traced later.";
    case "writing_indexes":
      return "Main file processing is done. Quantum is refreshing the indexes that make the latest archive and dataset output discoverable.";
    case "writing_outputs":
      return "Quantum is finalizing output for this run now.";
    default:
      return null;
  }
}

function getKnownProgressFileTotal(
  update: ImportProgressUpdate,
  sourceSummary: ImportSourceSummary | null,
  latestRun: ImportRunSummary | null
): number {
  if (update.filesDiscovered > 0) {
    return update.filesDiscovered;
  }

  if (sourceSummary?.supportedFiles && sourceSummary.supportedFiles > 0) {
    return sourceSummary.supportedFiles;
  }

  if (latestRun?.filesDiscovered && latestRun.filesDiscovered > 0) {
    return latestRun.filesDiscovered;
  }

  return 0;
}

function buildRunningStatusDetail(
  update: ImportProgressUpdate,
  sourceSummary: ImportSourceSummary | null,
  latestRun: ImportRunSummary | null
): string {
  const knownTotal = getKnownProgressFileTotal(update, sourceSummary, latestRun);
  const parts = [
    `${update.percent}% complete`,
    `${update.completedFiles} of ${knownTotal} file(s) processed`,
    formatProgressElapsed(update.elapsedMs)
  ];

  if (typeof update.reusedFiles === "number" && update.reusedFiles > 0) {
    parts.push(`${update.reusedFiles} reused`);
  }

  if (typeof update.retriedFiles === "number" && update.retriedFiles > 0) {
    parts.push(`${update.retriedFiles} retried`);
  }

  if (
    update.processingState === "retrying_failed_file" ||
    update.processingState === "resuming_interrupted_shard" ||
    update.processingState === "revalidating_previous_file" ||
    (typeof update.reusedFiles === "number" && update.reusedFiles > 0)
  ) {
    parts.push("preserved output safe");
  }

  if (update.resumeCheckpointCount && update.resumeCheckpointCount > 0) {
    parts.push(`${update.resumeCheckpointCount} checkpointed conversation(s)`);
  }

  if (update.currentPath) {
    parts.push(update.currentPath.split(/[\\/]/).pop() ?? update.currentPath);
  }

  const expectation = buildRunningExpectation(update);
  if (expectation) {
    parts.push(expectation);
  }

  return parts.join(" | ");
}

function buildRunningStatusBadges(
  update: ImportProgressUpdate,
  sourceSummary: ImportSourceSummary | null,
  latestRun: ImportRunSummary | null
): string[] {
  const knownTotal = getKnownProgressFileTotal(update, sourceSummary, latestRun);
  return [
    formatProgressStateLabel(update),
    `${update.completedFiles}/${knownTotal} file(s)`,
    update.currentKind ? update.currentKind.replace(/_/g, " ") : "",
    update.reusedFiles ? `${update.reusedFiles} reused` : "",
    update.retriedFiles ? `${update.retriedFiles} retried` : "",
    update.processingState === "retrying_failed_file" ||
    update.processingState === "resuming_interrupted_shard" ||
    update.processingState === "revalidating_previous_file"
      ? "preserved output safe"
      : "",
    update.processingState === "resuming_interrupted_shard" && update.resumeCheckpointCount
      ? `${update.resumeCheckpointCount} checkpointed`
      : ""
  ].filter(Boolean);
}

function buildRunningNextStepSummary(update: ImportProgressUpdate): string {
  switch (update.processingState) {
    case "revalidating_previous_file":
      return "Quantum is refreshing trust on a previously imported file before it decides whether the old output can stand for this run. Previously preserved output stays available while that check finishes.";
    case "reusing_completed_file":
      return "Quantum is reusing output it already verified for unchanged files, so this rerun should move faster than a cold import.";
    case "retrying_failed_file":
      return "Quantum is retrying the remaining file now, not discarding the work it already preserved earlier in the run. Let this finish before deciding whether diagnostics are still needed.";
    case "resuming_interrupted_shard":
      return "Quantum is resuming an interrupted shard from the last safe checkpoint instead of starting the whole file over again.";
    case "verifying_previous_output":
      return "Quantum is checking prior output now so it can explain what will be safely reused, resumed, retried, or processed fresh.";
    case "writing_history":
      return "Quantum has finished the main import work and is writing the run history that explains what was reused and what was newly processed.";
    case "writing_indexes":
      return "Quantum has finished the main import work and is refreshing the indexes that connect the latest archive and dataset output to the rest of the app.";
    case "writing_outputs":
      return "Quantum has finished the main import work and is writing the updated archive, dataset, and related output files now.";
    case "processing_new_file":
      return "Quantum is processing a file that still needs fresh work on this run.";
    default:
      return "Quantum is preparing the checked files for this rerun now. The next progress update should clarify whether it is reusing, retrying, or resuming work.";
  }
}

export default function ImportsScreen() {
  const { openRetrievalInvestigation, setActiveScreen } = useNavigation();
  const { setCurrentArtifact } = useAgentContext();
  const { settings, updateSettings, reopenOnboarding } = useSettings();
  const {
    runState,
    setRunState,
    statusMessage,
    setStatusMessage,
    importProgress,
    setImportProgress,
    logEntries,
    appendLogEntry
  } = useImportActivity();
  const [showImportHelp, setShowImportHelp] = useState(false);
  const [showSourceDetails, setShowSourceDetails] = useState(false);
  const [showRecoveryGuidance, setShowRecoveryGuidance] = useState(false);
  const [showImportHistoryDetails, setShowImportHistoryDetails] = useState(false);
  const [showCheckResults, setShowCheckResults] = useState(false);
  const [showRunLog, setShowRunLog] = useState(false);
  const [form, setForm] = useState<ImportJobForm>(() => loadImportFormDraft(settings.outputRoot));
  const [latestArchive, setLatestArchive] = useState<ArchiveNotification | null>(null);
  const [archiveEvents, setArchiveEvents] = useState<ArchiveNotification[]>([]);
  const [sourceSummary, setSourceSummary] = useState<ImportSourceSummary | null>(() => loadSourceSummaryDraft());
  const [importHistory, setImportHistory] = useState<ImportHistoryResult | null>(null);
  const [selectedRun, setSelectedRun] = useState<ImportRunSummary | null>(null);
  const [historyMode, setHistoryMode] = useState<"recent" | "query">("recent");
  const [historySearchBusy, setHistorySearchBusy] = useState(false);
  const [interactionMode, setInteractionMode] = useState<"idle" | "checked" | "import_succeeded" | "import_failed">("idle");

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
      appendLogEntry("info", "History search completed: " + result.runs.length + " matching run(s).");
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

  async function refreshSourceSummary(
    nextPath?: string,
    options?: { preserveStatusMessage?: boolean }
  ) {
    const sourcePath = nextPath ?? activeImportPath(form);
    if (!sourcePath.trim()) {
      setSourceSummary(null);
      return;
    }

    try {
      const result = await inspectSourcePath(sourcePath);
      setSourceSummary(result);

      if (result) {
        setInteractionMode("checked");
        if (!options?.preserveStatusMessage) {
          setStatusMessage("Source path checked.");
        }
        appendLogEntry(
          "info",
          "Inspected source path: " + result.supportedFiles + " supported file(s), " + result.unsupportedFiles + " unsupported."
        );
      }
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "Desktop bridge unavailable. Relaunch SkillSpring Quantum through Electron so real file inspection and imports can run.";
      setSourceSummary(null);
      setRunState("failed");
      setStatusMessage(message);
      appendLogEntry("error", message);
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
    handleOutputRootChange(nextPath);
  }

  async function handleSubmit() {
    if (!isImportReadyForExpectedVendor(sourceSummary, form.expectedVendor)) {
      const message = buildValidationNextStep(sourceSummary, form.expectedVendor);
      setRunState("idle");
      setStatusMessage(message);
      appendLogEntry("warning", message);
      return;
    }

    setRunState("running");
    setStatusMessage("Running import...");
    setImportProgress(null);
    appendLogEntry("info", "Import job submitted from UI scaffold.");

    updateSettings({ outputRoot: form.outputRoot });
    const result = await submitImportJob(form);

    if (result.stopped) {
      setInteractionMode(sourceSummary ? "checked" : "idle");
      setRunState("idle");
      setImportProgress(null);
      setStatusMessage(result.message);
      appendLogEntry("warning", result.message);
      return;
    }

    if (result.ok) {
      const refreshedHistory = await refreshImportHistory();
      setInteractionMode("import_succeeded");
      setRunState("success");
      setImportProgress(null);
      setStatusMessage(buildPostRunStatusMessage(refreshedHistory.latest, result.message));
      appendLogEntry("success", buildPostRunStatusMessage(refreshedHistory.latest, result.message));
      await refreshArchiveNotifications();
      await refreshSourceSummary(undefined, { preserveStatusMessage: true });
      return;
    }

    setInteractionMode("import_failed");
    setRunState("failed");
    setImportProgress(null);
    setStatusMessage(result.message);
    appendLogEntry("error", result.message);
  }

  async function handleStopImport() {
    const result = await stopImportJob();
    setImportProgress(null);
    setInteractionMode(sourceSummary ? "checked" : "idle");
    setRunState("idle");
    setStatusMessage(result.message);
    appendLogEntry(result.ok ? "warning" : "error", result.message);
  }

  useEffect(() => {
    refreshImportHistory();
    refreshArchiveNotifications();
  }, [form.outputRoot]);

  useEffect(() => {
    saveImportFormDraft(form);
  }, [form]);

  useEffect(() => {
    saveSourceSummaryDraft(sourceSummary);
  }, [sourceSummary]);

  useEffect(() => {
    if (runState === "running" && logEntries.length > 0) {
      setShowRunLog(true);
    }
  }, [runState, logEntries.length]);

  function handleOutputRootChange(nextOutputRoot: string) {
    setForm((prev) => ({ ...prev, outputRoot: nextOutputRoot }));
    updateSettings({ outputRoot: nextOutputRoot });
    setInteractionMode("idle");
    setStatusMessage(`Switched to output ${describeOutputRoot(nextOutputRoot)}. Quantum is loading that workspace's import history now.`);
    appendLogEntry("info", `Switched output root to ${nextOutputRoot}. Quantum will now use that workspace's history and reuse state.`);
  }

  function restoreLatestRunContext() {
    if (!latestRunForNextSteps) {
      return;
    }

    setForm(buildFormFromLatestRun(form, latestRunForNextSteps));
    setSourceSummary(null);
    setInteractionMode("idle");
    setStatusMessage(`Latest import path restored for output ${describeOutputRoot(latestRunForNextSteps.outputRoot)}. Re-check it if you want to confirm the export again before rerunning.`);
    appendLogEntry("info", `Restored the latest import path for output ${latestRunForNextSteps.outputRoot} into Start Here.`);
  }

  useEffect(() => {
    if (!desktopBridgeAvailable()) {
      const message = "Desktop bridge unavailable. Relaunch SkillSpring Quantum through Electron so real file inspection and imports can run.";
      setStatusMessage(message);
      appendLogEntry("error", message);
    }
  }, [appendLogEntry, setStatusMessage]);

  const latestRunForNextSteps = importHistory?.latest;
  const latestArchiveArtifactPath = findLatestArchiveArtifactPath(latestRunForNextSteps ?? null);
  const latestDatasetArtifactPath = findLatestDatasetArtifactPath(latestRunForNextSteps ?? null);
  const latestRunOutcomeSummary = summarizeRunOutcomeCounts(latestRunForNextSteps ?? null);
  const hasConversationOutputs = runHasUsableConversationOutputs(latestRunForNextSteps ?? null);
  const hasDatasetOutputs = runHasUsableDatasetOutputs(latestRunForNextSteps ?? null);
  const latestPackageCompanionSkips = countPackageCompanionSkips(latestRunForNextSteps ?? null);
  const runNeedsDiagnostics = runNeedsAttention(latestRunForNextSteps ?? null);
  const recoveryGuidance = buildRecoveryGuidance(latestRunForNextSteps ?? null);
  const showHistoryPanel = Boolean(importHistory?.runs.length || importHistory?.latest || historyMode === "query");
  const showArchivePanel = Boolean(latestArchive || archiveEvents.length > 0);
  const expectedVendorSummary = findExpectedVendorSummary(sourceSummary, form.expectedVendor);
  const importReady = isImportReadyForExpectedVendor(sourceSummary, form.expectedVendor);
  const expectedVendorMessage = buildExpectedVendorMessage(sourceSummary, form.expectedVendor);
  const validationCard = buildValidationCard(sourceSummary, form.expectedVendor);
  const showSourceResults = sourceSummary !== null;
  const showFirstUseResultsPlaceholder = !showSourceResults && !showHistoryPanel && !showArchivePanel;
  const showCurrentCheckStatus = runState !== "running" && interactionMode === "checked" && sourceSummary !== null;
  const showCurrentFailureStatus = runState === "failed" && interactionMode === "import_failed";
  const showHistoricalRunContinuation =
    Boolean(latestRunForNextSteps) &&
    interactionMode !== "checked" &&
    interactionMode !== "import_failed";
  const effectiveRunState =
    showCurrentCheckStatus
      ? "idle"
      : showCurrentFailureStatus
      ? "failed"
      : deriveVisibleRunState(runState, latestRunForNextSteps ?? null);
  const statusLead =
    showCurrentCheckStatus
      ? "This checked path is the current working context for the selected output folder. If it is the export you meant to use, import from this same path."
      : showCurrentFailureStatus
      ? "The current import attempt needs attention before you rely on the output or retry the same path."
      : undefined;
  const effectiveStatusMessage =
    showCurrentCheckStatus
      ? buildValidationOutcomeLead(sourceSummary, form.expectedVendor)
      : showCurrentFailureStatus
      ? statusMessage
      : runState === "idle" && latestRunForNextSteps
      ? buildPostRunStatusMessage(latestRunForNextSteps, statusMessage)
      : statusMessage;
  const statusDetail =
    showCurrentCheckStatus
      ? `Checked path: ${activeImportPath(form)} | output ${describeOutputRoot(form.outputRoot)}`
      : showCurrentFailureStatus
      ? `Attempted path: ${activeImportPath(form)} | output ${describeOutputRoot(form.outputRoot)}`
      : runState === "running" && importProgress
      ? buildRunningStatusDetail(importProgress, sourceSummary, latestRunForNextSteps ?? null)
      : latestRunForNextSteps && runState !== "running"
      ? `Latest run: ${new Date(latestRunForNextSteps.runAt).toLocaleString()} | output ${describeOutputRoot(latestRunForNextSteps.outputRoot)}`
      : undefined;
  const statusBadges =
    showCurrentCheckStatus
      ? [
          validationCard.badge,
          `${sourceSummary.supportedFiles} import-ready`,
          sourceSummary.unsupportedFiles > 0 ? `${sourceSummary.unsupportedFiles} not used` : "",
          `vendor ${formatExpectedVendorLabel(form.expectedVendor)}`
        ].filter(Boolean)
      : showCurrentFailureStatus
      ? [
          `vendor ${formatExpectedVendorLabel(form.expectedVendor)}`,
          `mode ${form.mode === "batch" ? "folder" : "file"}`,
          `output ${describeOutputRoot(form.outputRoot)}`
        ]
      : runState === "running" && importProgress
      ? buildRunningStatusBadges(importProgress, sourceSummary, latestRunForNextSteps ?? null)
      : latestRunForNextSteps && runState !== "running"
      ? [
          latestRunOutcomeSummary ?? "",
          hasConversationOutputs ? "archive available" : "",
          hasDatasetOutputs
            ? runNeedsDiagnostics
              ? "partial dataset available"
              : "structured view available"
            : ""
        ].filter(Boolean)
      : [];
  const latestRunFormSummary = latestRunForNextSteps
    ? {
        runAt: latestRunForNextSteps.runAt,
        vendorLabel: formatImportRunVendorLabel(latestRunForNextSteps),
        path: latestRunForNextSteps.inputPath,
        outputLabel: describeOutputRoot(latestRunForNextSteps.outputRoot),
        modeLabel: inferImportModeFromRun(latestRunForNextSteps) === "batch" ? "folder flow" : "file flow"
      }
    : null;

  function nextStepSummary(run: ImportRunSummary): string {
    const previouslyImported = countPreviouslyImportedSkips(run);
    if (run.filesImported === 0) {
      if (previouslyImported > 0) {
        return "This export was already imported successfully in the current output folder. Quantum reused the existing outputs there instead of processing the same files all over again. Open the existing archive, datasets, or current output folder to continue from the preserved work.";
      }
      return "This run did not produce imported files. Check the source summary and diagnostics before trying again.";
    }

    if (runNeedsDiagnostics) {
      return "The import finished, but there were skipped or failed files. Read the archive or datasets if they were produced, then check diagnostics for anything that needs attention.";
    }

    if (latestPackageCompanionSkips > 0) {
      return "The import finished cleanly. Quantum handled the vendor package through its main import file and kept companion files out of the dataset flow automatically.";
    }

    if (hasConversationOutputs) {
      return "The import finished cleanly. Start in Readable Archive, then open Datasets if you want the structured version.";
    }

    return "The import finished. Open the imported outputs to review what Quantum produced from this run.";
  }

  useEffect(() => {
    if (selectedRun) {
      setCurrentArtifact({
        screen: "imports",
        kind: "import_run",
        title: `Import run ${new Date(selectedRun.runAt).toLocaleString()}`,
        path: selectedRun.inputPath,
        summary: buildPostRunStatusMessage(selectedRun, "Import run in focus."),
        details: [
          formatImportRunVendorLabel(selectedRun),
          summarizeRunOutcomeCounts(selectedRun) ?? "",
          selectedRun.outputRoot ? `output ${describeOutputRoot(selectedRun.outputRoot)}` : ""
        ].filter(Boolean)
      });
      return;
    }

    if (sourceSummary) {
      setCurrentArtifact({
        screen: "imports",
        kind: "screen",
        title: "Import source check",
        path: activeImportPath(form),
        summary: `${sourceSummary.supportedFiles} supported file(s) and ${sourceSummary.unsupportedFiles} unsupported file(s) were found.`,
        details: [
          expectedVendorSummary ? `expected vendor ${formatVendorSummaryLabel(expectedVendorSummary.vendor)}` : "",
          sourceSummary.vendorSummaries[0] ? `detected ${formatVendorSummaryLabel(sourceSummary.vendorSummaries[0].vendor)}` : "",
          sourceSummary.notes[0] ?? ""
        ].filter(Boolean)
      });
      return;
    }

    setCurrentArtifact({
      screen: "imports",
      kind: "screen",
      title: "Imports",
      summary: "Import setup and export check state for the current output folder.",
      details: [`output ${describeOutputRoot(form.outputRoot)}`]
    });
  }, [
    selectedRun,
    sourceSummary,
    form,
    expectedVendorSummary,
    setCurrentArtifact
  ]);

  return (
    <section className="screen-grid imports-layout">
      <ImportForm
        value={form}
        importReady={importReady}
        latestRunSummary={latestRunFormSummary}
        onChange={setForm}
        onOutputRootChange={handleOutputRootChange}
        onRestoreLatestRun={latestRunForNextSteps ? restoreLatestRunContext : undefined}
        onSubmit={handleSubmit}
        onStopImport={handleStopImport}
        onBrowseSource={handleBrowseSource}
        onBrowseOutput={handleBrowseOutput}
        onInspectSource={() => refreshSourceSummary()}
        disabled={runState === "running"}
        isRunning={runState === "running"}
      />

      <RunStatusPanel
        className="workspace-anchor-panel"
        state={effectiveRunState}
        lead={statusLead}
        message={effectiveStatusMessage}
        detail={statusDetail}
        badges={statusBadges}
      />

      <div className="panel workspace-anchor-panel">
        <h2>Current Workspace</h2>
        <div className="detail-box follow-up-card">
          <strong>Output {describeOutputRoot(form.outputRoot)}</strong>
          <p className="muted">{buildOutputRootScopeHint(form.outputRoot)}</p>
          <p className="muted">{buildWorkspaceAvailabilityHint(form.outputRoot, latestRunForNextSteps ?? null)}</p>
        </div>
        <div className="action-bar">
          <OpenPathButton className="secondary-btn" targetPath={form.outputRoot}>
            Open Current Output Folder
          </OpenPathButton>
          {latestRunForNextSteps?.historyPath ? (
            <OpenPathButton className="secondary-btn" targetPath={latestRunForNextSteps.historyPath}>
              Open Latest Import History
            </OpenPathButton>
          ) : null}
        </div>
      </div>

      <div className="panel">
        <h2>Before You Import</h2>
        <p className="muted">
          Start with the export you actually downloaded. Check the path first, then import from that same path.
        </p>
        <div className="detail-box flow-summary-card">
          <strong>{buildValidationChecklistLead(sourceSummary, form.expectedVendor)}</strong>
          <div className="signal-badge-row">
            <span className="signal-badge">vendor {formatExpectedVendorLabel(form.expectedVendor)}</span>
            <span className="signal-badge">mode {form.mode === "batch" ? "folder" : "file"}</span>
            <span className="signal-badge">output {describeOutputRoot(form.outputRoot)}</span>
          </div>
        </div>
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
            <li>After import, start in Readable Archive. Open Datasets only when you want the structured version.</li>
          </ul>
        ) : null}
      </div>

      {showHistoricalRunContinuation && latestRunForNextSteps ? (
        <div className="panel workspace-anchor-panel">
          <h2>{runState === "running" ? "Current Import" : "Next Step"}</h2>
          <div className="detail-box follow-up-card">
            <strong>
              {runState === "running" && importProgress
                ? buildRunningNextStepSummary(importProgress)
                : nextStepSummary(latestRunForNextSteps)}
            </strong>
            <p className="muted">
              {runState === "running" && importProgress
                ? buildRunningStatusDetail(importProgress, sourceSummary, latestRunForNextSteps ?? null)
                : `Latest run in output ${describeOutputRoot(latestRunForNextSteps.outputRoot)}: ${new Date(latestRunForNextSteps.runAt).toLocaleString()} | ${latestRunOutcomeSummary}`}
            </p>
            <div className="signal-badge-row">
              <span
                className={
                  runState === "running"
                    ? "signal-badge"
                    : runNeedsDiagnostics
                    ? "signal-badge warning"
                    : "signal-badge success"
                }
              >
                {runState === "running" && importProgress
                  ? formatProgressStateLabel(importProgress)
                  : runNeedsDiagnostics
                  ? "spot-check next"
                  : "ready to continue"}
              </span>
              {runState === "running" && importProgress
                ? buildRunningStatusBadges(importProgress, sourceSummary, latestRunForNextSteps ?? null)
                    .filter((badge) => badge !== formatProgressStateLabel(importProgress))
                    .map((badge) => (
                      <span key={badge} className="signal-badge">
                        {badge}
                      </span>
                    ))
                : null}
              {runState !== "running" && hasConversationOutputs ? (
                <span className="signal-badge">
                  {runNeedsDiagnostics ? "partial archive available" : "archive available"}
                </span>
              ) : null}
              {runState !== "running" && hasDatasetOutputs ? (
                <span className="signal-badge">
                  {runNeedsDiagnostics ? "partial dataset available" : "dataset view ready"}
                </span>
              ) : null}
            </div>
          </div>
          {runState !== "running" && latestPackageCompanionSkips > 0 ? (
            <p className="muted">
              Package note: {latestPackageCompanionSkips} companion file(s) were expected and were handled through the main import automatically instead of being treated like separate sources.
            </p>
          ) : null}
          <div className="action-bar">
            {runState !== "running" && hasConversationOutputs ? (
              <button className="primary-btn" type="button" onClick={() => setActiveScreen("organized-output")}>
                Open Readable Archive
              </button>
            ) : null}
            {runState !== "running" && hasDatasetOutputs ? (
              <button className="primary-btn" type="button" onClick={() => setActiveScreen("datasets")}>
                {runNeedsDiagnostics ? "Open Partial Dataset View" : "Open Dataset View"}
              </button>
            ) : null}
            {runState === "running" ? (
              <button className="secondary-btn" type="button" onClick={handleStopImport}>
                Force Stop Import
              </button>
            ) : null}
            {runState === "running" ? (
              <button className="secondary-btn" type="button" onClick={() => setActiveScreen("diagnostics")}>
                Open Diagnostics If This Stalls
              </button>
            ) : null}
            {runState !== "running" && runNeedsDiagnostics ? (
              <button className="secondary-btn" type="button" onClick={() => setActiveScreen("diagnostics")}>
                Open Diagnostics
              </button>
            ) : null}
            {runState !== "running" && latestArchiveArtifactPath ? (
              <OpenPathButton className="secondary-btn" targetPath={latestArchiveArtifactPath}>
                Open Latest Archive File
              </OpenPathButton>
            ) : null}
            {runState !== "running" && latestDatasetArtifactPath ? (
              <OpenPathButton className="secondary-btn" targetPath={latestDatasetArtifactPath}>
                Open Latest Dataset File
              </OpenPathButton>
            ) : null}
            {runState !== "running" ? (
              <OpenPathButton className="secondary-btn" targetPath={latestRunForNextSteps.outputRoot}>
                Open Current Output Folder
              </OpenPathButton>
            ) : null}
          </div>
        </div>
      ) : null}

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
            Your latest archive update will appear here after a successful import.
          </p>
        </div>
      )}

      <div className="panel">
        <h2>Export Check</h2>
        {!sourceSummary ? (
          <div className="detail-box validation-summary-card idle">
            <span className="match-card-kicker">Check required</span>
            <strong>Run the export check before importing anything.</strong>
            <p className="muted">
              Pick a vendor and export path, then use <strong>Check This Export</strong> before you import.
            </p>
            <p className="muted">{buildPreInspectVendorHint(form.expectedVendor)}</p>
          </div>
        ) : (
          <>
            <div className={"match-card validation-summary-card " + validationCard.toneClass}>
              <span className="match-card-kicker">{validationCard.kicker}</span>
              <strong>{validationCard.title}</strong>
              <p>{buildValidationOutcomeLead(sourceSummary, form.expectedVendor)}</p>
              <p className="muted">{expectedVendorMessage}</p>
              <div className="detail-box validation-next-step-box">
                <span className="label">Best next move</span>
                <strong>{buildValidationNextStep(sourceSummary, form.expectedVendor)}</strong>
              </div>
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
                  {sourceSummary.supportedFiles} import-ready
                </span>
                {sourceSummary.unsupportedFiles > 0 ? (
                  <span className="signal-badge">
                    {sourceSummary.unsupportedFiles} not used
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
              <button className="primary-btn" type="button" onClick={() => refreshSourceSummary()}>
                Re-Check This Path
              </button>
              {sourceSummary.supportedFiles > 0 ? (
                <button className="primary-btn" type="button" onClick={handleSubmit}>
                  Import This Export
                </button>
              ) : null}
            </div>
            {buildLegacyChatGptLaneHint(sourceSummary, runState) ? (
              <p className="muted">{buildLegacyChatGptLaneHint(sourceSummary, runState)}</p>
            ) : null}
          </>
        )}
      </div>

      {showHistoricalRunContinuation && latestRunForNextSteps && recoveryGuidance.length > 0 ? (
        <div className="panel">
        <h2>Check Before You Move On</h2>
        <p className="muted">
            This run deserves a quick spot-check before you rely on every output.
        </p>
          <div className="action-bar">
            <button
              className="secondary-btn"
              type="button"
              onClick={() => setShowRecoveryGuidance((value) => !value)}
            >
              {showRecoveryGuidance ? "Hide What To Check" : "Show What To Check"}
            </button>
            <button className="secondary-btn" type="button" onClick={() => refreshSourceSummary()}>
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
              Open this only when you want to compare runs, reopen an older one, or send a specific result into Find Imports.
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
                {sourceSummary.countsByKind.chatgpt_export +
                  sourceSummary.countsByKind.conversation_json +
                  sourceSummary.countsByKind.gemini_activity_html}
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
          <div className="detail-box">
            <strong>Ordinary path</strong>
            <p className="muted">Imports -&gt; Readable Archive -&gt; Datasets -&gt; Find Imports</p>
            <p className="muted">
              Stay on this path for the normal workflow. Diagnostics and the other extra tools only matter when trust breaks or something needs explanation.
            </p>
          </div>
          <div className="stats-grid onboarding-grid">
            <div className="stat-card">
              <span className="label">Step 1</span>
              <strong>Choose the export source</strong>
              <p className="muted">Pick the vendor first so the check result is easier to interpret.</p>
            </div>
            <div className="stat-card">
              <span className="label">Step 2</span>
              <strong>Run the export check</strong>
              <p className="muted">Look for a ready, caution, or mismatch result before you import.</p>
            </div>
            <div className="stat-card">
              <span className="label">Step 3</span>
              <strong>Import from the same path</strong>
              <p className="muted">Then continue into Readable Archive before moving into Datasets.</p>
            </div>
          </div>
          <div className="action-bar">
            <button className="secondary-btn" type="button" onClick={reopenOnboarding}>
              Open Walkthrough
            </button>
          </div>
        </div>
      ) : null}

      <div className="panel large">
        <h2>Activity Log</h2>
        <p className="muted">
          Use this to verify what Quantum has been doing step by step, especially during long imports, stop requests, or follow-up checks.
        </p>
        <div className="action-bar">
          <button className="secondary-btn" type="button" onClick={() => setShowRunLog((value) => !value)}>
            {showRunLog ? "Hide Activity Log" : "Show Activity Log"}
          </button>
          <button className="secondary-btn" type="button" onClick={() => setActiveScreen("activity-log")}>
            Open Activity History Screen
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

function isImportReadyForExpectedVendor(
  sourceSummary: ImportSourceSummary | null,
  expectedVendor: ImportVendorChoice
): boolean {
  if (!sourceSummary || sourceSummary.supportedFiles === 0) {
    return false;
  }

  if (expectedVendor === "auto_detect") {
    return true;
  }

  return sourceSummary.vendorSummaries.some((summary) => summary.vendor === expectedVendor);
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

function buildValidationChecklistLead(
  sourceSummary: ImportSourceSummary | null,
  expectedVendor: ImportVendorChoice
): string {
  if (!sourceSummary) {
    return "Choose the export you downloaded, check it once, then import from that same path.";
  }

  if (sourceSummary.supportedFiles === 0) {
    return "This path still needs adjustment before import.";
  }

  if (sourceSummary.geminiTakeoutAttachmentOnly) {
    return "This Gemini Takeout folder needs a fresh export with My Activity and Gemini Apps selected before import.";
  }

  if (expectedVendor === "auto_detect") {
    return "Quantum found something usable here. Keep this path if it matches the export you meant to import.";
  }

  const match = sourceSummary.vendorSummaries.find((summary) => summary.vendor === expectedVendor);
  if (!match) {
    return "The selected vendor and the checked path do not line up yet.";
  }

  if (match.supportTier === "mvp_first_class") {
    return "This export matches the selected vendor and is ready for the normal import path.";
  }

  return "This export can still move forward, but it deserves a closer spot-check after import.";
}

function buildExpectedVendorMessage(
  sourceSummary: ImportSourceSummary | null,
  expectedVendor: ImportVendorChoice
): string {
  if (!sourceSummary) {
    return "No export has been checked yet.";
  }

  if (sourceSummary.geminiTakeoutAttachmentOnly) {
    return "This Google Takeout folder contains Gemini attachments or Gems data, not Gemini conversation history. Re-export with My Activity > Gemini Apps selected.";
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
    if (expectedVendor === "chatgpt" && sourceSummaryHasLegacyChatGptBundle(sourceSummary)) {
      return "This path looks like a legacy ChatGPT chat bundle. It is still importable, but it may take the heavier chat.html route instead of the newer shard-first lane.";
    }
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

function formatExpectedVendorLabel(expectedVendor: ImportVendorChoice): string {
  return expectedVendor === "auto_detect" ? "Auto Detect" : EXPECTED_VENDOR_LABELS[expectedVendor];
}

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

  if (sourceSummary.geminiTakeoutAttachmentOnly) {
    return {
      title: "Gemini chat history not found",
      toneClass: "warning-box",
      state: "mismatch",
      kicker: "Check result",
      badge: "re-export needed"
    };
  }

  if (expectedVendor === "auto_detect") {
    return sourceSummary.supportedFiles > 0
      ? { title: "Usable export found", toneClass: "context-tip", state: "ready", kicker: "Check result", badge: "import-ready" }
      : { title: "No usable export found yet", toneClass: "warning-box", state: "mismatch", kicker: "Check result", badge: "nothing usable yet" };
  }

  const match = sourceSummary.vendorSummaries.find((summary) => summary.vendor === expectedVendor);
  if (!match) {
    return {
      title: "Vendor mismatch",
      toneClass: "warning-box",
      state: "mismatch",
      kicker: "Check result",
      badge: "wrong vendor"
    };
  }

  if (match.supportTier === "mvp_first_class") {
    return {
      title: "Ready to import",
      toneClass: "context-tip",
      state: "ready",
      kicker: "Check result",
      badge: "import-ready"
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

function buildValidationOutcomeLead(
  sourceSummary: ImportSourceSummary | null,
  expectedVendor: ImportVendorChoice
): string {
  if (!sourceSummary) {
    return "No export has been checked yet.";
  }

  if (sourceSummary.supportedFiles === 0) {
    return "Quantum did not find a usable import path in this file or folder yet.";
  }

  if (sourceSummary.geminiTakeoutAttachmentOnly) {
    return "Quantum found Gemini attachments, but not the conversation activity needed for a Gemini import.";
  }

  if (expectedVendor === "auto_detect") {
    return sourceSummary.unsupportedFiles > 0
      ? "Quantum found something it can import here, along with extra files it will leave alone."
      : "Quantum found an importable export here.";
  }

  const match = sourceSummary.vendorSummaries.find((summary) => summary.vendor === expectedVendor);
  if (!match) {
    return `This path does not currently look like the ${EXPECTED_VENDOR_LABELS[expectedVendor]} export you selected.`;
  }

  if (match.supportTier === "mvp_first_class") {
    return `This path matches the ${EXPECTED_VENDOR_LABELS[expectedVendor]} export you selected and is ready for the normal import path.`;
  }

  if (match.supportTier === "mvp_compatibility_fallback") {
    return `This path matches the ${EXPECTED_VENDOR_LABELS[expectedVendor]} export you selected, but Quantum will use a recovery path.`;
  }

  return `Quantum found some ${EXPECTED_VENDOR_LABELS[expectedVendor]} clues here, but not enough for a clean import yet.`;
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

  if (sourceSummary.geminiTakeoutAttachmentOnly) {
    return "Re-export from Google Takeout with My Activity selected, then choose only Gemini Apps before checking the new folder.";
  }

  if (expectedVendor === "auto_detect") {
    return "If this is the folder you meant to import, you can keep this path and run the import.";
  }

  const match = sourceSummary.vendorSummaries.find((summary) => summary.vendor === expectedVendor);
  if (!match) {
    return "Switch to the vendor that matches this folder, or browse to a different export before importing.";
  }

  if (match.supportTier === "mvp_first_class") {
    if (expectedVendor === "chatgpt" && sourceSummaryHasLegacyChatGptBundle(sourceSummary)) {
      return "This looks like the older ChatGPT chat.html bundle. If this is the export you meant to use, import it from this path. If not, switch paths now before committing to the heavier legacy lane.";
    }
    return "This looks good. If this is the export you meant to use, import from this same path.";
  }

  if (match.supportTier === "mvp_compatibility_fallback") {
    return "You can still import this path, but plan to review the archive and one dataset preview afterward.";
  }

  return "This path was partly recognized, but it is safer to browse to the downloaded export root before importing.";
}

function buildSourceSummaryLead(sourceSummary: ImportSourceSummary): string {
  if (sourceSummary.geminiTakeoutAttachmentOnly) {
    return "Quantum found a Gemini Takeout attachment package, but no Gemini conversation activity that it can safely import.";
  }

  if (sourceSummaryHasLegacyChatGptBundle(sourceSummary)) {
    return "Quantum found a legacy ChatGPT chat bundle here. It can still import this export, but this older chat.html lane may be heavier than newer shard-first packages.";
  }

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

function describeOutputRoot(outputRoot: string): string {
  const normalized = outputRoot.replace(/[\\/]+$/, "");
  const segments = normalized.split(/[\\/]/).filter(Boolean);
  return segments[segments.length - 1] ?? outputRoot;
}

function loadImportFormDraft(outputRoot: string): ImportJobForm {
  try {
    const raw = sessionStorage.getItem(IMPORT_FORM_DRAFT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ImportJobForm>;
      return {
        mode: parsed.mode === "batch" ? "batch" : "single_file",
        expectedVendor: isImportVendorChoice(parsed.expectedVendor) ? parsed.expectedVendor : "auto_detect",
        inputFile: typeof parsed.inputFile === "string" ? parsed.inputFile : "",
        inputFolder: typeof parsed.inputFolder === "string" ? parsed.inputFolder : "",
        outputRoot: typeof parsed.outputRoot === "string" && parsed.outputRoot.trim() ? parsed.outputRoot : outputRoot
      };
    }
  } catch {
    // ignore saved draft errors
  }

  try {
    localStorage.removeItem(LEGACY_IMPORT_FORM_DRAFT_KEY);
  } catch {
    // ignore legacy draft cleanup errors
  }

  return {
    mode: "single_file",
    expectedVendor: "auto_detect",
    inputFile: "",
    inputFolder: "",
    outputRoot
  };
}

function loadSourceSummaryDraft(): ImportSourceSummary | null {
  try {
    const raw = sessionStorage.getItem(SOURCE_SUMMARY_DRAFT_KEY);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as ImportSourceSummary;
  } catch {
    return null;
  }
}

function saveSourceSummaryDraft(sourceSummary: ImportSourceSummary | null) {
  try {
    if (!sourceSummary) {
      sessionStorage.removeItem(SOURCE_SUMMARY_DRAFT_KEY);
      return;
    }

    sessionStorage.setItem(SOURCE_SUMMARY_DRAFT_KEY, JSON.stringify(sourceSummary));
  } catch {
    // ignore storage errors
  }
}

function saveImportFormDraft(form: ImportJobForm) {
  try {
    sessionStorage.setItem(IMPORT_FORM_DRAFT_KEY, JSON.stringify(form));
    localStorage.removeItem(LEGACY_IMPORT_FORM_DRAFT_KEY);
  } catch {
    // ignore storage errors
  }
}

function isImportVendorChoice(value: unknown): value is ImportVendorChoice {
  return (
    value === "auto_detect" ||
    value === "chatgpt" ||
    value === "claude" ||
    value === "grok" ||
    value === "gemini" ||
    value === "copilot"
  );
}

function deriveVisibleRunState(runState: RunState, latestRun: ImportRunSummary | null): RunState {
  if (runState !== "idle") {
    return runState;
  }

  if (!latestRun) {
    return "idle";
  }

  if (latestRun.filesImported > 0) {
    return "success";
  }

  return "failed";
}

function buildFormFromLatestRun(currentForm: ImportJobForm, latestRun: ImportRunSummary): ImportJobForm {
  const mode = inferImportModeFromRun(latestRun);
  const expectedVendor = inferImportVendorFromRun(latestRun);

  return {
    mode,
    expectedVendor,
    inputFile: mode === "single_file" ? latestRun.inputPath : "",
    inputFolder: mode === "batch" ? latestRun.inputPath : "",
    outputRoot: latestRun.outputRoot || currentForm.outputRoot
  };
}

function inferImportModeFromRun(latestRun: ImportRunSummary): ImportMode {
  const normalized = latestRun.inputPath.trim();
  const lastSegment = normalized.split(/[\\/]/).filter(Boolean).pop() ?? normalized;
  const looksLikeFile = /\.[A-Za-z0-9]{1,10}$/.test(lastSegment);

  if (looksLikeFile && latestRun.filesDiscovered <= 1 && countPackageCompanionSkips(latestRun) === 0) {
    return "single_file";
  }

  return "batch";
}

function inferImportVendorFromRun(latestRun: ImportRunSummary): ImportVendorChoice {
  const firstVendor = latestRun.retrievalSummary?.vendorSources[0]?.toLowerCase();

  switch (firstVendor) {
    case "chatgpt":
    case "claude":
    case "grok":
    case "gemini":
    case "copilot":
      return firstVendor;
    default:
      return "auto_detect";
  }
}

function formatImportRunVendorLabel(latestRun: ImportRunSummary): string {
  const vendor = inferImportVendorFromRun(latestRun);
  return formatExpectedVendorLabel(vendor);
}
