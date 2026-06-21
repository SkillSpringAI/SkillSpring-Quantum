import { useEffect, useMemo, useState } from "react";
import ReviewQueueTable from "../components/ReviewQueueTable";
import type { ReviewQueueEmptyState } from "../components/ReviewQueueTable";
import ActionBar from "../components/ActionBar";
import type { ReviewQueueRecord } from "../types/review";
import {
  buildQueueKey,
  loadReviewQueue,
  rebuildReviewQueue,
  submitReviewDecision
} from "../services/reviewQueueBridge";
import { useSettings } from "../state/settingsContext";

export default function ReviewQueueScreen() {
  const [records, setRecords] = useState<ReviewQueueRecord[]>([]);
  const [selected, setSelected] = useState<ReviewQueueRecord | null>(null);
  const [reason, setReason] = useState("Promote after manual review");
  const [status, setStatus] = useState("Loading review queue...");
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const { settings } = useSettings();

  const selectedKey = useMemo(
    () => (selected ? buildQueueKey(selected) : undefined),
    [selected]
  );

  const emptyState: ReviewQueueEmptyState = useMemo(() => {
    if (!hasLoaded) return "loading";
    if (loadError) return "error";
    if (records.length === 0) return "empty";
    return "loading";
  }, [hasLoaded, loadError, records.length]);

  async function handleDecision(decision: "approve" | "reject") {
    if (!selected) return;

    const result = await submitReviewDecision({
      outputRoot: settings.outputRoot,
      decision,
      queueKey: buildQueueKey(selected),
      reason
    });

    setStatus(result.message);
    await refreshQueue();
  }

  async function refreshQueue() {
    setStatus("Loading review queue...");
    setHasLoaded(false);
    const result = await loadReviewQueue(settings.outputRoot);
    setHasLoaded(true);
    setRecords(result.records);
    setSelected(result.records[0] ?? null);

    if (result.message && result.records.length === 0) {
      const lower = result.message.toLowerCase();
      if (lower.includes("error") || lower.includes("failed") || lower.includes("not found") || lower.includes("no such")) {
        setLoadError(true);
        setErrorMessage(result.message);
        setStatus(result.message);
        return;
      }
    }

    setLoadError(false);
    setErrorMessage("");
    setStatus(
      result.records.length > 0
        ? result.message ?? "Review queue loaded."
        : result.message ?? "No review queue records found."
    );
  }

  async function handleRebuildQueue() {
    setStatus("Building review queue...");
    const result = await rebuildReviewQueue(settings.outputRoot);
    setStatus(result.message);
    await refreshQueue();
  }

  useEffect(() => {
    refreshQueue();
  }, [settings.outputRoot]);

  return (
    <section className="screen-grid review-layout">
      <ReviewQueueTable
        records={records}
        selectedKey={selectedKey}
        onSelect={setSelected}
        emptyState={emptyState}
        errorMessage={errorMessage}
      />

      <div className="panel">
        <h2>Selected Record</h2>
        <div className="action-bar">
          <button className="secondary-btn" type="button" onClick={handleRebuildQueue}>
            Build Queue
          </button>
        </div>

        {selected ? (
          <>
            <p><strong>Title:</strong> {selected.title ?? "Untitled"}</p>
            <p><strong>Topic:</strong> {selected.topic}</p>
            <p><strong>Queue Key:</strong> {buildQueueKey(selected)}</p>
            <p><strong>Signal Score:</strong> {selected.signal_score}</p>
            <p><strong>Signal Tier:</strong> {selected.signal_tier}</p>
            <p><strong>Reasons:</strong> {selected.signal_reasons.join(", ")}</p>

            <label className="form-label">
              Decision Reason
              <textarea
                className="text-area"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>

            <ActionBar
              onApprove={() => handleDecision("approve")}
              onReject={() => handleDecision("reject")}
              approveDisabled={!reason.trim()}
              rejectDisabled={!reason.trim()}
            />

            {status ? <p className="muted">{status}</p> : null}
          </>
        ) : (
          renderEmptySelectionState(emptyState, status)
        )}
      </div>
    </section>
  );
}

function renderEmptySelectionState(state: ReviewQueueEmptyState, status: string) {
  switch (state) {
    case "error":
      return (
        <>
          <p className="muted">No record is selected because the queue could not be loaded.</p>
          <p className="muted">{status}</p>
          <p className="muted">Try rebuilding the queue. If the error persists, check that the output folder path is correct in Settings and that the dataset exists.</p>
        </>
      );
    case "empty":
      return (
        <>
          <p className="muted">No record is selected because the queue is currently empty.</p>
          <p className="muted">{status}</p>
          <p className="muted">Build the queue after a new import if you want to review records here, or adjust governance rules if you expected matches.</p>
        </>
      );
    case "loading":
    default:
      return <p className="muted">Loading review queue...</p>;
  }
}
