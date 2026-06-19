import type { RunState } from "../types/imports";

interface RunStatusPanelProps {
  state: RunState;
  message: string;
}

function formatRunStateLabel(state: RunState): string {
  switch (state) {
    case "idle":
      return "Ready";
    case "running":
      return "Working";
    case "success":
      return "Finished";
    case "failed":
      return "Needs Attention";
    default:
      return state;
  }
}

export default function RunStatusPanel(props: RunStatusPanelProps) {
  return (
    <div className="panel">
      <h2>Import Status</h2>
      <div className="status-row">
        <span className={"status-pill " + props.state}>{formatRunStateLabel(props.state)}</span>
      </div>
      <p className="muted">{props.message}</p>
    </div>
  );
}
