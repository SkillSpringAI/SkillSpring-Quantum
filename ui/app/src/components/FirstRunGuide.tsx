import { useMemo, useState } from "react";
import { useNavigation } from "../state/navigationContext";
import { useSettings } from "../state/settingsContext";

export default function FirstRunGuide() {
  const { settings, dismissOnboarding } = useSettings();
  const { setActiveScreen } = useNavigation();
  const [showExample, setShowExample] = useState(false);

  const visible = useMemo(() => !settings.onboardingDismissed, [settings.onboardingDismissed]);

  if (!visible) {
    return null;
  }

  return (
    <div className="first-run-guide-backdrop" role="presentation">
      <div className="first-run-guide panel" role="dialog" aria-modal="true" aria-labelledby="first-run-guide-title">
        <div className="panel-heading-row">
          <div>
            <h2 id="first-run-guide-title">Welcome to SkillSpring Quantum</h2>
            <p className="muted">
              Start with one export, check it once, then follow the ordinary path into archive and dataset review.
            </p>
          </div>
          <span className="status-pill idle">First use</span>
        </div>

        <div className="stats-grid onboarding-grid">
          <div className="stat-card">
            <span className="label">Step 1</span>
            <strong>Pick the export source</strong>
            <p className="muted">Choose ChatGPT, Claude, Grok, Gemini, Copilot, or Auto Detect before browsing.</p>
          </div>
          <div className="stat-card">
            <span className="label">Step 2</span>
            <strong>Check the export first</strong>
            <p className="muted">Use the export check before importing so Quantum can confirm the path looks usable.</p>
          </div>
          <div className="stat-card">
            <span className="label">Step 3</span>
            <strong>Start review in Archive</strong>
            <p className="muted">Read the human-readable archive first, then open datasets when you want structured output.</p>
          </div>
        </div>

        <div className="detail-box">
          <strong>Ordinary path</strong>
          <p className="muted">Imports -&gt; Readable Archive -&gt; Datasets -&gt; Find Imports</p>
          <p className="muted">
            Diagnostics and the other extra tools are there when something needs explanation, not as the normal starting point.
          </p>
        </div>

        <div className="action-bar">
          <button
            className="primary-btn"
            type="button"
            onClick={() => {
              setActiveScreen("imports");
              dismissOnboarding();
            }}
          >
            Start Guided Import
          </button>
          <button
            className="secondary-btn"
            type="button"
            onClick={() => setShowExample((current) => !current)}
          >
            {showExample ? "Hide Example Walkthrough" : "See Example Walkthrough"}
          </button>
          <button className="secondary-btn" type="button" onClick={dismissOnboarding}>
            Skip For Now
          </button>
        </div>

        {showExample ? (
          <div className="detail-box">
            <strong>Example walkthrough</strong>
            <ul className="list">
              <li>Pick `Claude` or `ChatGPT` and browse to the downloaded export folder.</li>
              <li>Use `Check This Export` and confirm Quantum says the path is ready or clearly explains any caution.</li>
              <li>Run the import from the same path, then open `Readable Archive` first.</li>
              <li>Open `Dataset View` only when you want the structured version of what you just reviewed.</li>
            </ul>
            <p className="muted">
              This is the smallest guided version for now. A short tutorial video can later replace or reinforce this walkthrough.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
