import { useEffect, useState } from "react";
import { loadImportHistory } from "../services/importHistoryBridge";
import { loadImportRetrievalIndex } from "../services/importRetrievalIndexBridge";
import { revealDesktopPath } from "../services/pathBridge";
import type { ImportRunFileResult, ImportRunSummary } from "../types/importHistory";
import type { ImportRetrievalIndexResult } from "../types/importRetrievalIndex";

export default function DashboardScreen() {
  const [latestRun, setLatestRun] = useState<ImportRunSummary | null>(null);
  const [retrievalIndex, setRetrievalIndex] = useState<ImportRetrievalIndexResult | null>(null);

  useEffect(() => {
    loadImportHistory("organized_output", 1).then((result) => {
      setLatestRun(result.latest);
    });
    loadImportRetrievalIndex("organized_output").then(setRetrievalIndex);
  }, []);

  const latestTrustBadges = summarizeLatestRunSignals(latestRun);

  return (
    <section className="screen-grid">
      <div className="panel large">
        <h2>System Snapshot</h2>
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
      </div>

      <div className="panel">
        <h2>Retrieval Index</h2>
        {!retrievalIndex?.latest ? (
          <p className="muted">
            No compact import retrieval index has been written yet. Run an import to generate one.
          </p>
        ) : (
          <>
            <p className="muted">
              {retrievalIndex.latest.entryCount} indexed file records across {retrievalIndex.latest.runCount} import run(s)
            </p>
            <p className="muted">
              Recognized vendors: {retrievalIndex.latest.vendorSources.length > 0 ? retrievalIndex.latest.vendorSources.join(", ") : "none yet"}
            </p>
            <p className="muted">
              Topics: {retrievalIndex.latest.topicHints.slice(0, 4).join(", ") || "none yet"}
            </p>
            <div className="action-bar">
              <button className="primary-btn" type="button" onClick={() => revealDesktopPath(retrievalIndex.latestFile)}>
                Open Retrieval Index
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
              Imported {latestRun.filesImported} of {latestRun.filesDiscovered} file(s), skipped {latestRun.unsupportedFilesSkipped}.
            </p>
            {latestTrustBadges.length > 0 ? (
              <p className="muted">
                {latestTrustBadges.map((badge) => badge.label).join(" | ")}
              </p>
            ) : null}
          </>
        ) : (
          <p className="muted">No import runs recorded yet.</p>
        )}
      </div>

      <div className="panel">
        <h2>Purpose</h2>
        <p className="muted">
          SkillSpring Quantum is becoming a local archive and dataset engine for major AI exports, with retrieval-ready metadata layered in as imports are processed.
        </p>
      </div>
    </section>
  );
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

  for (const result of run.results) {
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
