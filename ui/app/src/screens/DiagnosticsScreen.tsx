import { useEffect, useState } from "react";
import DiagnosticsSummaryCard from "../components/DiagnosticsSummaryCard";
import RecommendationList from "../components/RecommendationList";
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

export default function DiagnosticsScreen() {
  const [latestRun, setLatestRun] = useState<LatestRunSummary | null>(null);
  const [batchAggregate, setBatchAggregate] = useState<BatchAggregateSummary | null>(null);
  const [batchDelta, setBatchDelta] = useState<BatchDeltaSummary | null>(null);
  const [recommendations, setRecommendations] = useState<DiagnosticsRecommendation[]>([]);
  const [status, setStatus] = useState("Ready.");

  useEffect(() => {
    async function loadAll() {
      setLatestRun(await loadLatestRunSummary());
      setBatchAggregate(await loadBatchAggregateSummary());
      setBatchDelta(await loadBatchDeltaSummary());
      setRecommendations(await loadDiagnosticsRecommendations());
    }

    loadAll();
  }, []);

  async function handleRunDiagnostics() {
    setStatus("Submitting run diagnostics...");
    const response = await triggerRunDiagnostics("organized_output");
    setStatus(response.ok ? (response.message ?? "Run diagnostics submitted.") : response.error);
  }

  async function handleBatchDiagnostics() {
    setStatus("Submitting batch diagnostics...");
    const response = await triggerBatchDiagnostics("organized_output");
    setStatus(response.ok ? (response.message ?? "Batch diagnostics submitted.") : response.error);
  }

  async function handleBatchDelta() {
    setStatus("Submitting batch delta...");
    const response = await triggerBatchDelta("organized_output");
    setStatus(response.ok ? (response.message ?? "Batch delta submitted.") : response.error);
  }

  return (
    <section className="screen-grid diagnostics-layout">
      <div className="panel large">
        <h2>Diagnostics Actions</h2>
        <div className="action-bar">
          <button className="primary-btn" onClick={handleRunDiagnostics}>
            Run Diagnostics
          </button>
          <button className="primary-btn" onClick={handleBatchDiagnostics}>
            Build Batch Diagnostics
          </button>
          <button className="primary-btn" onClick={handleBatchDelta}>
            Build Batch Delta
          </button>
        </div>
        <p className="muted">{status}</p>
      </div>

      {latestRun ? (
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
      ) : null}

      {batchAggregate ? (
        <DiagnosticsSummaryCard
          title="Batch Aggregate"
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
      ) : null}

      {batchDelta ? (
        <DiagnosticsSummaryCard
          title="Batch Delta"
          items={[
            { label: "Comparable", value: String(batchDelta.comparable) },
            { label: "Duplicate Delta", value: batchDelta.duplicateRateDelta ?? "n/a" },
            { label: "Private Review Delta", value: batchDelta.privateReviewRateDelta ?? "n/a" },
            { label: "Yield Delta", value: batchDelta.segmentYieldDelta ?? "n/a" },
            { label: "Purge Delta", value: batchDelta.purgeRateDelta ?? "n/a" }
          ]}
        />
      ) : null}

      <RecommendationList items={recommendations} />
    </section>
  );
}
