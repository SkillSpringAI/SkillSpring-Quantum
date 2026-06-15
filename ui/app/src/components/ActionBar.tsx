interface ActionBarProps {
  onApprove?: () => void;
  onReject?: () => void;
  approveDisabled?: boolean;
  rejectDisabled?: boolean;
}

export default function ActionBar(props: ActionBarProps) {
  return (
    <div className="action-bar">
      <button
        className="primary-btn"
        onClick={props.onApprove}
        disabled={props.approveDisabled}
      >
        Approve
      </button>

      <button
        className="secondary-btn"
        onClick={props.onReject}
        disabled={props.rejectDisabled}
      >
        Reject
      </button>
    </div>
  );
}
