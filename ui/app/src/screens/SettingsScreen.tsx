import { useState } from "react";
import { useSettings } from "../state/settingsContext";
import { chooseFolder } from "../services/importBridge";

export default function SettingsScreen() {
  const { settings, updateSettings } = useSettings();
  const [status, setStatus] = useState("");

  async function handleBrowseOutput() {
    const nextPath = await chooseFolder();
    if (!nextPath) return;
    updateSettings({ outputRoot: nextPath, outputRootConfirmed: true });
    setStatus("Output root updated to: " + nextPath);
  }

  function handleClear() {
    updateSettings({ outputRoot: "", outputRootConfirmed: false });
    setStatus("Output root cleared. Choose a folder before running imports or advanced tools.");
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
          <p className="muted">
            Choose a folder you control. Quantum does not assume a packaged-app default output location on first use.
          </p>
          <p><code>{settings.outputRoot || "No output folder selected yet."}</code></p>
          <div className="action-bar">
            <button className="primary-btn" type="button" onClick={handleBrowseOutput}>
              Choose Output Folder
            </button>
            <button className="secondary-btn" type="button" onClick={handleClear}>
              Clear Selection
            </button>
          </div>
          {status ? <p className="muted">{status}</p> : null}
        </div>
      </div>
    </section>
  );
}
