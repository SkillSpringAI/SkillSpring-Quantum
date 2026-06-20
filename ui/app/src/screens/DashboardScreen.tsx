import { useEffect, useState } from "react";
import { loadImportHistory } from "../services/importHistoryBridge";
import { loadImportRetrievalIndex } from "../services/importRetrievalIndexBridge";
import type { ImportRunFileResult, ImportRunSummary } from "../types/importHistory";
import type { ImportRetrievalIndexResult } from "../types/importRetrievalIndex";
import { useNavigation } from "../state/navigationContext";
import {
  countPackageCompanionSkips,
  countUnexpectedSkippedFiles,
  isPackageCompanionSkip,
  runNeedsAttention
} from "../utils/importTrust";

export default function DashboardScreen() {
  const { setActiveScreen } = useNavigation();
  const [latestRun, setLatestRun] = useState<ImportRunSummary | null>(null);
  const [retrievalIndex, setRetrievalIndex] = useState<ImportRetrievalIndexResult | null>(null);

  useEffect(() => {
    loadImportHistory("organized_output", 1).then((result) => {
      setLatestRun(result.latest);
    });
    loadImportRetrievalIndex("organized_output").then(setRetrievalIndex);
  }, []);

  const latestTrustBadges = summarizeLatestRunSignals(latestRun);
  const runNeedsDiagnostics = runNeedsAttention(latestRun);
  const hasConversationOutputs = (latestRun?.conversationFilesProcessed ?? 0) > 0;
  const hasDatasetOutputs = !!latestRun?.retrievalSummary;
  const latestOutcomeSummary = latestRun ? summarizeRunOutcomeCounts(latestRun) : null;
  const latestPackageCompanionSkips = countPackageCompanionSkips(latestRun);

  return (
    <section className="screen-grid">
      <div className="panel large">
        <h2>Quick Status</h2>
        <p className="muted">
          Imports is the main starting point. Use this screen for a quick check, then jump back into the next step of the workflow.
        </p>
        <div className="stats-grid">
          <div className="stat-card">
            <span className="label">Latest Import</span>
            <strong>{latestRun ? latestRun.filesImported + " files" : "None yet"}</strong>
          </div>
          <div className="stat-card">
            <span className="label">Document Imports</span>
            <strong>{latestRun ? latestRun.genericDocumentsProcessed : 0}</strong>
          </div>
          <div className="stat-card">
            <span className="label">Conversation Imports</span>
            <strong>{latestRun ? latestRun.conversationFilesProcessed : 0}</strong>
          </div>
          <div className="stat-card">
            <span className="label">Failed Files</span>
            <strong>{latestRun ? latestRun.filesFailed : 0}</strong>
          </div>
        </div>
        {latestTrustBadges.length > 0 ? (
          <div className="signal-badge-row dashboard-badge-row">
            {latestTrustBadges.map((badge) => (
              <span
                key={badge.label}
                className={
                  badge.tone === "success"
                    ? "signal-badge success"
                    : badge.tone === "warning"
                      ? "signal-badge warning"
                      : "signal-badge"
                }
              >
                {badge.label}
              </span>
            ))}
          </div>
        ) : null}
        <div className="action-bar">
          <button className="primary-btn" type="button" onClick={() => setActiveScreen("imports")}>
            Go To Imports
          </button>
          {hasConversationOutputs ? (
            <button className="secondary-btn" type="button" onClick={() => setActiveScreen("organized-output")}>
              Open Readable Archive
            </button>
          ) : null}
          {hasDatasetOutputs ? (
            <button className="secondary-btn" type="button" onClick={() => setActiveScreen("datasets")}>
              Open Datasets
            </button>
          ) : null}
          {runNeedsDiagnostics ? (
            <button className="secondary-btn" type="button" onClick={() => setActiveScreen("diagnostics")}>
              Check Diagnostics
            </button>
          ) : null}
        </div>
      </div>

      <div className="panel">
        <h2>Find Imports</h2>
        {!retrievalIndex?.latest ? (
          <p className="muted">
            No search file has been written yet. Run an import first, then use Find Imports to locate past files quickly.
          </p>
        ) : (
          <>
            <p className="muted">
              {retrievalIndex.latest.entryCount} files are available across {retrievalIndex.latest.runCount} import run(s).
            </p>
            <p className="muted">
              Vendors: {retrievalIndex.latest.vendorSources.length > 0 ? retrievalIndex.latest.vendorSources.join(", ") : "none yet"}
            </p>
            <p className="muted">
              Topics: {retrievalIndex.latest.topicHints.slice(0, 4).join(", ") || "none yet"}
            </p>
            <div className="action-bar">
              <button className="primary-btn" type="button" onClick={() => setActiveScreen("retrieval")}>
                Open Find Imports
              </button>
            </div>
          </>
        )}
      </div>

      <div className="panel">
        <h2>Latest Import</h2>
        {latestRun ? (
          <>
            <p className="muted">{new Date(latestRun.runAt).toLocaleString()}</p>
            <p className="muted">{latestRun.inputPath}</p>
            <p className="muted">
              Imported {latestRun.filesImported} of {latestRun.filesDiscovered} file(s). {latestOutcomeSummary}
            </p>
            <p className="muted">
              {runNeedsDiagnostics
                ? "This run needs a quick follow-up check."
                : latestPackageCompanionSkips > 0
                  ? "This run handled a vendor export package cleanly and kept companion files out of the dataset flow."
                : hasConversationOutputs
                  ? "This run is ready to review in the readable archive."
                  : "This run completed and is ready for output review."}
            </p>
            {latestTrustBadges.length > 0 ? (
              <p className="muted">
                {latestTrustBadges.map((badge) => badge.label).join(" | ")}
              </p>
            ) : null}
          </>
        ) : (
          <p className="muted">No import runs recorded yet. Start in Imports to inspect a file or folder and run your first local import.</p>
        )}
      </div>

      <div className="panel">
        <h2>Main Flow</h2>
        <p className="muted">Inspect export -> import locally -> read archive -> review datasets -> check diagnostics only when needed.</p>
      </div>
    </section>
  );
}

function summarizeRunOutcomeCounts(run: ImportRunSummary): string {
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

function summarizeLatestRunSignals(
  run: ImportRunSummary | null
): Array<{ label: string; tone: "success" | "warning" | "neutral" }> {
  if (!run) {
    return [];
  }

  let extractedTextFiles = 0;
  let archiveOnlyFiles = 0;
  let preservedBlobFiles = 0;
  let missingBlobFiles = 0;
  let attachmentReferenceFiles = 0;
  let packageCompanionFiles = 0;

  for (const result of run.results) {
    if (isPackageCompanionSkip(result)) {
      packageCompanionFiles += 1;
    }
    collectResultSignals(result, {
      onExtractedText: () => {
        extractedTextFiles += 1;
      },
      onArchiveOnly: () => {
        archiveOnlyFiles += 1;
      },
      onBlobPreserved: () => {
        preservedBlobFiles += 1;
      },
      onBlobMissing: () => {
        missingBlobFiles += 1;
      },
      onAttachmentReferences: () => {
        attachmentReferenceFiles += 1;
      }
    });
  }

  const badges: Array<{ label: string; tone: "success" | "warning" | "neutral" }> = [];

  if (extractedTextFiles > 0) {
    badges.push({ label: extractedTextFiles + " extracted text", tone: "success" });
  }

  if (archiveOnlyFiles > 0) {
    badges.push({ label: archiveOnlyFiles + " archived only", tone: "warning" });
  }

  if (attachmentReferenceFiles > 0) {
    badges.push({ label: attachmentReferenceFiles + " file(s) with attachments", tone: "neutral" });
  }

  if (preservedBlobFiles > 0) {
    badges.push({ label: preservedBlobFiles + " blobs preserved", tone: "success" });
  }

  if (missingBlobFiles > 0) {
    badges.push({ label: missingBlobFiles + " package missing blobs", tone: "warning" });
  }

  if (packageCompanionFiles > 0) {
    badges.push({ label: packageCompanionFiles + " package companions handled", tone: "success" });
  }

  return badges;
}

function collectResultSignals(
  result: ImportRunFileResult,
  handlers: {
    onExtractedText: () => void;
    onArchiveOnly: () => void;
    onBlobPreserved: () => void;
    onBlobMissing: () => void;
    onAttachmentReferences: () => void;
  }
) {
  const metadata = result.metadata;
  const normalizedMessage = result.message.toLowerCase();

  if (metadata?.sourceCategory === "document") {
    if (metadata.parseStatus === "text_extracted") {
      handlers.onExtractedText();
    }

    if (metadata.parseStatus === "binary_archived_only") {
      handlers.onArchiveOnly();
    }
  }

  if (metadata?.sourceCategory === "conversation" && metadata.attachmentCount > 0) {
    handlers.onAttachmentReferences();
  }

  if (normalizedMessage.includes("attachment blob(s) preserved")) {
    handlers.onBlobPreserved();
  }

  if (normalizedMessage.includes("referenced blob(s) missing")) {
    handlers.onBlobMissing();
  }
}
