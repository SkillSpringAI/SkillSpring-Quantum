import type { RunState } from "../types/imports";

interface RunStatusPanelProps {
  state: RunState;
  message: string;
}

export default function RunStatusPanel(props: RunStatusPanelProps) {
  return (
    <div className="panel">
      <h2>Run Status</h2>
      <div className="status-row">
        <span className={"status-pill " + props.state}>{props.state}</span>
      </div>
      <p className="muted">{props.message}</p>
    </div>
  );
}
