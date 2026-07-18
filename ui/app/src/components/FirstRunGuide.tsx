import { useState } from "react";
import { useNavigation } from "../state/navigationContext";
import { useSettings } from "../state/settingsContext";
import { chooseFolder } from "../services/importBridge";

type WalkthroughStep = {
  id: string;
  label: string;
  title: string;
  screen: "imports" | "organized-output" | "datasets" | "retrieval";
  summary: string;
  check: string;
  cta: string;
};

const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    id: "imports",
    label: "Step 1",
    title: "Check one export in Imports",
    screen: "imports",
    summary: "Choose ChatGPT, Claude, Grok, Gemini, Copilot, or Auto Detect, then run the export check before importing.",
    check: "Look for a clear ready, caution, or mismatch result before you import.",
    cta: "Open Imports"
  },
  {
    id: "archive",
    label: "Step 2",
    title: "Read the Archive first",
    screen: "organized-output",
    summary: "Use Readable Archive as the first review lane after import so the conversation stays human-readable.",
    check: "Confirm the archive body, source clues, and next action feel easy to follow.",
    cta: "Open Archive"
  },
  {
    id: "datasets",
    label: "Step 3",
    title: "Open Dataset View when you want structure",
    screen: "datasets",
    summary: "Go to Datasets after archive review when you want topic segments, prompt/response previews, or redaction context.",
    check: "Confirm the dataset view still feels connected to what you just reviewed in Archive.",
    cta: "Open Datasets"
  },
  {
    id: "retrieval",
    label: "Step 4",
    title: "Use Find Imports when you need to trace it later",
    screen: "retrieval",
    summary: "Find Imports is the follow-up lane for searching prior runs, checking match evidence, and reopening context.",
    check: "Make sure the selected result explains why it matched and where to go next.",
    cta: "Open Find Imports"
  }
];

export default function FirstRunGuide() {
  const { settings, dismissOnboarding, updateSettings } = useSettings();
  const { activeScreen, setActiveScreen } = useNavigation();
  const [showExample, setShowExample] = useState(false);
  const [outputRootStatus, setOutputRootStatus] = useState("");

  if (settings.onboardingDismissed) {
    return null;
  }

  async function handleChooseOutputRoot() {
    const nextPath = await chooseFolder();
    if (!nextPath) return;

    updateSettings({
      outputRoot: nextPath,
      outputRootConfirmed: true
    });
    setOutputRootStatus("Output folder selected: " + nextPath);
  }

  function openWalkthroughStep(step: WalkthroughStep) {
    if (!settings.outputRootConfirmed || !settings.outputRoot.trim()) {
      setOutputRootStatus("Choose an output folder first so Quantum knows where to write archives, datasets, diagnostics, and history.");
      return;
    }

    setActiveScreen(step.screen);
    dismissOnboarding();
  }

  return (
    <div className="first-run-guide-backdrop" role="presentation">
      <div className="first-run-guide panel" role="dialog" aria-modal="true" aria-labelledby="first-run-guide-title">
        <div className="panel-heading-row">
          <div>
            <h2 id="first-run-guide-title">Welcome to SkillSpring Quantum</h2>
            <p className="muted">
              Start with one export, check it once, then follow the ordinary path through archive, datasets, and retrieval only when you need it.
            </p>
          </div>
          <span className="status-pill idle">First use</span>
        </div>

        <div className="detail-box">
          <strong>Choose your output folder first</strong>
          <p className="muted">
            Quantum stores archives, datasets, diagnostics, and history in one local workspace folder that you choose.
          </p>
          <p className="muted">
            Recommended: create or choose a folder such as <code>Documents\Quantum outputs</code>, then keep using that same workspace for follow-up imports and review.
          </p>
          <p><code>{settings.outputRoot || "No output folder selected yet."}</code></p>
          <div className="action-bar">
            <button className="primary-btn" type="button" onClick={handleChooseOutputRoot}>
              Choose Output Folder
            </button>
          </div>
          {outputRootStatus ? <p className="muted">{outputRootStatus}</p> : null}
        </div>

        <div className="detail-box">
          <strong>Ordinary path</strong>
          <p className="muted">Imports -&gt; Readable Archive -&gt; Datasets -&gt; Find Imports</p>
          <p className="muted">
            Diagnostics and the other extra tools are there when something needs explanation, not as the normal starting point.
          </p>
        </div>

        <div className="stats-grid onboarding-grid">
          {WALKTHROUGH_STEPS.map((step) => {
            const active = activeScreen === step.screen;
            return (
              <div key={step.id} className={active ? "stat-card selected-row" : "stat-card"}>
                <span className="label">{step.label}</span>
                <strong>{step.title}</strong>
                <p className="muted">{step.summary}</p>
                <p className="muted">{step.check}</p>
                <div className="action-bar">
                  <button className={step.screen === "imports" ? "primary-btn" : "secondary-btn"} type="button" onClick={() => openWalkthroughStep(step)}>
                    {step.cta}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="action-bar">
          <button
            className="primary-btn"
            type="button"
            onClick={() => openWalkthroughStep(WALKTHROUGH_STEPS[0])}
            disabled={!settings.outputRootConfirmed || !settings.outputRoot.trim()}
          >
            Start Guided Import
          </button>
          <button
            className="secondary-btn"
            type="button"
            onClick={() => setShowExample((current) => !current)}
          >
            {showExample ? "Hide Walkthrough Notes" : "See Walkthrough Notes"}
          </button>
          <button
            className="secondary-btn"
            type="button"
            onClick={dismissOnboarding}
            disabled={!settings.outputRootConfirmed || !settings.outputRoot.trim()}
          >
            Skip For Now
          </button>
        </div>

        {showExample ? (
          <div className="detail-box">
            <strong>Reusable walkthrough path</strong>
            <ul className="list">
              <li>Use one recognizable export and keep the same path through check and import.</li>
              <li>After import, review Readable Archive before opening Datasets.</li>
              <li>Use Find Imports only after the main review path works and you want to trace the run back later.</li>
              <li>If trust breaks or the normal path gets confusing, open Diagnostics then record why it became necessary.</li>
            </ul>
            <p className="muted">
              This is the stable walkthrough we can reuse for internal checks, outside beta onboarding, and a future short tutorial video.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
