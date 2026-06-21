import type { ReviewQueueRecord } from "../types/review";
import { buildQueueKey } from "../services/reviewQueueBridge";

export type ReviewQueueEmptyState =
  | "loading"
  | "error"
  | "empty";

interface ReviewQueueTableProps {
  records: ReviewQueueRecord[];
  selectedKey?: string;
  onSelect?: (record: ReviewQueueRecord) => void;
  emptyState?: ReviewQueueEmptyState;
  errorMessage?: string;
}

export default function ReviewQueueTable(props: ReviewQueueTableProps) {
  if (props.records.length === 0) {
    return (
      <div className="panel">
        <h2>Review Queue</h2>
        {renderEmptyState(props.emptyState, props.errorMessage)}
      </div>
    );
  }

  return (
    <div className="panel">
      <h2>Review Queue</h2>
      <div className="table-wrap">
        <table className="review-table">
          <thead>
            <tr>
              <th>Topic</th>
              <th>Signal</th>
              <th>Messages</th>
              <th>Bounds</th>
              <th>Conversation</th>
            </tr>
          </thead>
          <tbody>
            {props.records.map((record) => {
              const key = buildQueueKey(record);
              const isSelected = props.selectedKey === key;

              return (
                <tr
                  key={key}
                  className={isSelected ? "selected-row" : ""}
                  onClick={() => props.onSelect?.(record)}
                >
                  <td>{record.topic}</td>
                  <td>{record.signal_score}</td>
                  <td>{record.message_count}</td>
                  <td>
                    {record.start_index} - {record.end_index}
                  </td>
                  <td>{record.conversation_id.slice(0, 12)}...</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function renderEmptyState(state: ReviewQueueEmptyState | undefined, errorMessage?: string) {
  switch (state) {
    case "error":
      return (
        <>
          <p className="muted">The review queue could not be loaded.</p>
          <p className="muted">{errorMessage || "Check that the output folder exists and that the queue has been built at least once."}</p>
        </>
      );
    case "empty":
      return (
        <>
          <p className="muted">No review queue records are available for this output folder right now.</p>
          <p className="muted">Build the queue after an import if you want to review segments before promotion, or adjust governance rules if you expected records to appear.</p>
        </>
      );
    case "loading":
    default:
      return <p className="muted">Loading review queue...</p>;
  }
}
