import { useNavigation } from "../state/navigationContext";

export default function Topbar() {
  const { activeLabel } = useNavigation();

  return (
    <header className="topbar">
      <div>
        <h1>{activeLabel}</h1>
        <p className="muted">Desktop-first control plane</p>
      </div>
      <div className="topbar-actions">
        <span className="status-pill">Ready</span>
        <button className="primary-btn">Import Exports</button>
      </div>
    </header>
  );
}
