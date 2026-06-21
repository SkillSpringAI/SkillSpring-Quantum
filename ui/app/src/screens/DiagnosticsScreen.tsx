import { useEffect, useState } from "react";
import DiagnosticsSummaryCard from "../components/DiagnosticsSummaryCard";
import RecommendationList from "../components/RecommendationList";
import { revealDesktopPath } from "../services/pathBridge";
import type {
  BatchAggregateSummary,
  BatchDeltaSummary,
  DiagnosticsRecommendation,
  LatestRunSummary
} from "../types/diagnostics";
import {
  loadBatchAggregateSummary,
  loadBatchDeltaSummary,
  loadDiagnosticsRecommendations,
  loadLatestRunSummary,
  triggerBatchDelta,
  triggerBatchDiagnostics,
  triggerRunDiagnostics
} from "../services/diagnosticsBridge";
import { useNavigation } from "../state/navigationContext";
import { useSettings } from "../state/settingsContext";

function buildDiagnosticsPaths(outputRoot = "organized_output") {
  return {
    latestRun: outputRoot + "\\diagnostics\\latest-run.json",
    diagnosticsRoot: outputRoot + "\\diagnostics",
    failuresRoot: outputRoot + "\\diagnostics\\failures",
    batchAggregate: outputRoot + "\\diagnostics\\batch-aggregate-diagnostics.json",
    batchDelta: outputRoot + "\\diagnostics\\batch-delta-report.json"
  };
}

function describeLatestRun(latestRun: LatestRunSummary | null): string {
  if (!latestRun) {
    return "Run diagnostics will appear here after the first import finishes.";
  }

  if (latestRun.status !== "success") {
    return "The latest import run did not finish cleanly. Open the latest diagnostics file first, then check the failures folder if errors were recorded.";
  }

  if (latestRun.errors > 0) {
    return "The latest import finished with errors recorded. Open the diagnostics file to see what needs attention.";
  }

  if (latestRun.warnings > 0) {
    return "The latest import completed, but there were warnings worth checking before you rely on the output fully.";
  }

  return "The latest import completed cleanly with no major diagnostic concerns recorded.";
}

function describeBatchHealth(batchAggregate: BatchAggregateSummary | null): string {
  if (!batchAggregate) {
    return "Batch health summaries will appear here after you build them.";
  }

  if (batchAggregate.filesFailed > 0) {
    return "Some files failed across the batch. Check failures before treating the batch as fully reliable.";
  }

  if (batchAggregate.privateReviewRate > 0.15) {
    return "A high share of segments needed private review, so this batch may need closer trust and privacy inspection.";
  }

  if (batchAggregate.purgeRate > 0.2) {
    return "A large share of segments were filtered out, which can be a sign that the intake quality or topic filtering needs review.";
  }

  return "Batch-level health looks steady. Use this view to spot shifts after parser, redaction, or rules changes.";
}

function describeBatchDelta(batchDelta: BatchDeltaSummary | null): string {
  if (!batchDelta) {
    return "Batch delta becomes useful after you have more than one batch snapshot to compare.";
  }

  if (!batchDelta.comparable) {
    return "There is not enough earlier batch history yet to compare this run against a previous one.";
  }

  return "Use delta to see whether duplicates, private-review load, yield, or purge behavior changed after recent work.";
}

export default function DiagnosticsScreen() {
  const { setActiveScreen } = useNavigation();
  const { settings } = useSettings();
  const [latestRun, setLatestRun] = useState<LatestRunSummary | null>(null);
  const [batchAggregate, setBatchAggregate] = useState<BatchAggregateSummary | null>(null);
  const [batchDelta, setBatchDelta] = useState<BatchDeltaSummary | null>(null);
  const [recommendations, setRecommendations] = useState<DiagnosticsRecommendation[]>([]);
  const [status, setStatus] = useState("Ready.");
  const diagnosticsPaths = buildDiagnosticsPaths(settings.outputRoot);

  useEffect(() => {
    async function loadAll() {
      setLatestRun(await loadLatestRunSummary());
      setBatchAggregate(await loadBatchAggregateSummary());
      setBatchDelta(await loadBatchDeltaSummary());
      setRecommendations(await loadDiagnosticsRecommendations());
    }

    loadAll();
  }, [settings.outputRoot]);

  async function handleRunDiagnostics() {
    setStatus("Building latest-run diagnostics...");
    const response = await triggerRunDiagnostics(settings.outputRoot);
    setStatus(response.ok ? (response.message ?? "Run diagnostics submitted.") : response.error);
  }

  async function handleBatchDiagnostics() {
    setStatus("Building batch health summary...");
    const response = await triggerBatchDiagnostics(settings.outputRoot);
    setStatus(response.ok ? (response.message ?? "Batch diagnostics submitted.") : response.error);
  }

  async function handleBatchDelta() {
    setStatus("Building batch comparison...");
    const response = await triggerBatchDelta(settings.outputRoot);
    setStatus(response.ok ? (response.message ?? "Batch delta submitted.") : response.error);
  }

  return (
    <section className="screen-grid diagnostics-layout">
      <div className="panel large">
        <h2>Diagnostics Actions</h2>
        {!latestRun && !batchAggregate && !batchDelta ? (
          <>
            <p className="muted">
              No diagnostics are available yet. Start in Imports, run an import, then return here only if you want to check warnings, failures, or run health.
            </p>
            <div className="action-bar">
              <button className="primary-btn" type="button" onClick={() => setActiveScreen("imports")}>
                Go To Imports
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="muted">
              Use this screen when you want a plain-English check on whether recent imports finished cleanly or need follow-up.
            </p>
            <p className="muted">
              Start with the latest run check. Batch health and batch comparison are secondary views for troubleshooting or regression checks.
            </p>
            <div className="action-bar">
              <button className="primary-btn" onClick={handleRunDiagnostics}>
                Refresh Latest Run
              </button>
              <button className="primary-btn" onClick={handleBatchDiagnostics}>
                Build Batch Health (Advanced)
              </button>
              <button className="primary-btn" onClick={handleBatchDelta}>
                Compare Batch Changes (Advanced)
              </button>
              <button className="secondary-btn" onClick={() => revealDesktopPath(diagnosticsPaths.latestRun)}>
                Open Latest Diagnostics
              </button>
              <button className="secondary-btn" onClick={() => revealDesktopPath(diagnosticsPaths.failuresRoot)}>
                Open Failures Folder
              </button>
            </div>
          </>
        )}
        <p className="muted">{status}</p>
      </div>

      {latestRun ? (
        <div className="panel">
          <DiagnosticsSummaryCard
            title="Latest Run"
            items={[
              { label: "Status", value: latestRun.status },
              { label: "Files", value: latestRun.filesProcessed },
              { label: "Conversations", value: latestRun.conversationsFound },
              { label: "Raw Written", value: latestRun.rawConversationsWritten },
              { label: "Segments", value: latestRun.segmentsCreated },
              { label: "Purged", value: latestRun.segmentsPurged },
              { label: "Warnings", value: latestRun.warnings },
              { label: "Errors", value: latestRun.errors }
            ]}
          />
          <p className="muted">{describeLatestRun(latestRun)}</p>
        </div>
      ) : null}

      {batchAggregate ? (
        <div className="panel">
          <DiagnosticsSummaryCard
            title="Batch Health (Advanced)"
            items={[
              { label: "Files Attempted", value: batchAggregate.filesAttempted },
              { label: "Files Succeeded", value: batchAggregate.filesSucceeded },
              { label: "Files Failed", value: batchAggregate.filesFailed },
              { label: "Duplicate Rate", value: batchAggregate.duplicateRate },
              { label: "Private Review Rate", value: batchAggregate.privateReviewRate },
              { label: "Segment Yield", value: batchAggregate.segmentYield },
              { label: "Purge Rate", value: batchAggregate.purgeRate }
            ]}
          />
          <p className="muted">{describeBatchHealth(batchAggregate)}</p>
          <div className="action-bar">
            <button className="secondary-btn" onClick={() => revealDesktopPath(diagnosticsPaths.batchAggregate)}>
              Open Batch Health File
            </button>
          </div>
        </div>
      ) : null}

      {batchDelta ? (
        <div className="panel">
          <DiagnosticsSummaryCard
            title="Batch Comparison (Advanced)"
            items={[
              { label: "Comparable", value: String(batchDelta.comparable) },
              { label: "Duplicate Delta", value: batchDelta.duplicateRateDelta ?? "n/a" },
              { label: "Private Review Delta", value: batchDelta.privateReviewRateDelta ?? "n/a" },
              { label: "Yield Delta", value: batchDelta.segmentYieldDelta ?? "n/a" },
              { label: "Purge Delta", value: batchDelta.purgeRateDelta ?? "n/a" }
            ]}
          />
          <p className="muted">{describeBatchDelta(batchDelta)}</p>
          <div className="action-bar">
            <button className="secondary-btn" onClick={() => revealDesktopPath(diagnosticsPaths.batchDelta)}>
              Open Batch Comparison File
            </button>
            <button className="secondary-btn" onClick={() => revealDesktopPath(diagnosticsPaths.diagnosticsRoot)}>
              Open Diagnostics Folder
            </button>
          </div>
        </div>
      ) : null}

      <RecommendationList items={recommendations} />
    </section>
  );
}
