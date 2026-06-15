export default function DashboardScreen() {
  return (
    <section className="screen-grid">
      <div className="panel large">
        <h2>System Snapshot</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <span className="label">Pipeline</span>
            <strong>Structured</strong>
          </div>
          <div className="stat-card">
            <span className="label">Diagnostics</span>
            <strong>Tracked</strong>
          </div>
          <div className="stat-card">
            <span className="label">Review Queue</span>
            <strong>Active</strong>
          </div>
          <div className="stat-card">
            <span className="label">Governance</span>
            <strong>Visible</strong>
          </div>
        </div>
      </div>

      <div className="panel">
        <h2>Purpose</h2>
        <p className="muted">
          SkillSpring Quantum is a governance-first desktop control plane for ingestion,
          diagnostics, review, and curated dataset refinement.
        </p>
      </div>

      <div className="panel">
        <h2>Operator Loop</h2>
        <ul className="list">
          <li>Import</li>
          <li>Inspect</li>
          <li>Review</li>
          <li>Promote</li>
          <li>Govern</li>
        </ul>
      </div>
    </section>
  );
}
