import { useState } from "react";
import { useSettings } from "../state/settingsContext";
import { chooseFolder } from "../services/importBridge";

export default function SettingsScreen() {
  const { settings, updateSettings } = useSettings();
  const [status, setStatus] = useState("");

  async function handleBrowseOutput() {
    const nextPath = await chooseFolder();
    if (!nextPath) return;
    updateSettings({ outputRoot: nextPath });
    setStatus("Output root updated to: " + nextPath);
  }

  function handleReset() {
    updateSettings({ outputRoot: "organized_output" });
    setStatus("Output root reset to default: organized_output");
  }

  return (
    <section className="screen-grid">
      <div className="panel">
        <h2>Settings</h2>
        <p className="muted">
          App preferences, output roots, desktop bridge config, and future shell settings surface here.
        </p>
        <div className="detail-box">
          <strong>Output Root</strong>
          <p className="muted">This is where Quantum writes archives, datasets, diagnostics, and history.</p>
          <p><code>{settings.outputRoot}</code></p>
          <div className="action-bar">
            <button className="primary-btn" type="button" onClick={handleBrowseOutput}>
              Choose Output Folder
            </button>
            <button className="secondary-btn" type="button" onClick={handleReset}>
              Reset to Default
            </button>
          </div>
          {status ? <p className="muted">{status}</p> : null}
        </div>
      </div>
    </section>
  );
}
