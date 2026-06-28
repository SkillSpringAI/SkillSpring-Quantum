import type { RunState } from "../types/imports";

interface RunStatusPanelProps {
  state: RunState;
  message: string;
}

function formatRunStateLead(state: RunState): string {
  switch (state) {
    case "idle":
      return "Pick an export, run the check, then import from the same path when it looks right.";
    case "running":
      return "Quantum is checking or importing this export now.";
    case "success":
      return "The latest import finished. Use the next-step card to continue into Archive or Structured View.";
    case "failed":
      return "The latest import needs attention before you rely on the output.";
    default:
      return "";
  }
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
      <div className="panel-heading-row">
        <h2>Import Status</h2>
        <span className={"status-pill " + props.state}>{formatRunStateLabel(props.state)}</span>
      </div>
      <div className="detail-box status-summary-card">
        <strong>{formatRunStateLead(props.state)}</strong>
        <p className="muted">{props.message}</p>
      </div>
    </div>
  );
}
