import { useNavigation } from "../state/navigationContext";
import { useSettings } from "../state/settingsContext";

export default function Topbar() {
  const { activeLabel, setActiveScreen } = useNavigation();
  const { settings, reopenOnboarding } = useSettings();

  return (
    <header className="topbar">
      <div>
        <h1>{activeLabel}</h1>
        <p className="muted">Bring in exports, read them clearly, and follow the next step when you need it.</p>
      </div>
      <div className="topbar-actions">
        {settings.onboardingDismissed ? (
          <button className="secondary-btn" type="button" onClick={reopenOnboarding}>
            Open Walkthrough
          </button>
        ) : null}
        <span className="status-pill">Ready</span>
        <button className="primary-btn" type="button" onClick={() => setActiveScreen("imports")}>
          Go To Imports
        </button>
      </div>
    </header>
  );
}
