import { useEffect, useMemo, useState } from "react";
import ReviewQueueTable from "../components/ReviewQueueTable";
import ActionBar from "../components/ActionBar";
import type { ReviewQueueRecord } from "../types/review";
import {
  buildQueueKey,
  loadReviewQueue,
  rebuildReviewQueue,
  submitReviewDecision
} from "../services/reviewQueueBridge";

export default function ReviewQueueScreen() {
  const [records, setRecords] = useState<ReviewQueueRecord[]>([]);
  const [selected, setSelected] = useState<ReviewQueueRecord | null>(null);
  const [reason, setReason] = useState("Promote after manual review");
  const [status, setStatus] = useState("Loading review queue...");

  const selectedKey = useMemo(
    () => (selected ? buildQueueKey(selected) : undefined),
    [selected]
  );

  async function handleDecision(decision: "approve" | "reject") {
    if (!selected) return;

    const result = await submitReviewDecision({
      outputRoot: "organized_output",
      decision,
      queueKey: buildQueueKey(selected),
      reason
    });

    setStatus(result.message);
    await refreshQueue();
  }

  async function refreshQueue() {
    const result = await loadReviewQueue();
    setRecords(result.records);
    setSelected(result.records[0] ?? null);
    setStatus(
      result.records.length > 0
        ? result.message ?? "Review queue loaded."
        : result.message ?? "No review queue records found."
    );
  }

  async function handleRebuildQueue() {
    const result = await rebuildReviewQueue();
    setStatus(result.message);
    await refreshQueue();
  }

  useEffect(() => {
    refreshQueue();
  }, []);

  return (
    <section className="screen-grid review-layout">
      <ReviewQueueTable
        records={records}
        selectedKey={selectedKey}
        onSelect={setSelected}
      />

      <div className="panel">
        <h2>Selected Record</h2>
        <button className="secondary-btn" type="button" onClick={handleRebuildQueue}>
          Build Queue
        </button>

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
          <p className="muted">Select a review queue record.</p>
        )}
      </div>
    </section>
  );
}
