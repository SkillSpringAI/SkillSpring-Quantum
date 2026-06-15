import type { ReviewQueueRecord } from "../types/review";
import { buildQueueKey } from "../services/reviewQueueBridge";

interface ReviewQueueTableProps {
  records: ReviewQueueRecord[];
  selectedKey?: string;
  onSelect?: (record: ReviewQueueRecord) => void;
}

export default function ReviewQueueTable(props: ReviewQueueTableProps) {
  if (props.records.length === 0) {
    return (
      <div className="panel">
        <h2>Review Queue</h2>
        <p className="muted">No queued records loaded yet.</p>
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
