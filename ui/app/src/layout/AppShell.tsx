import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import ScreenErrorBoundary from "../components/ScreenErrorBoundary";
import DashboardScreen from "../screens/DashboardScreen";
import ImportsScreen from "../screens/ImportsScreen";
import ActivityLogScreen from "../screens/ActivityLogScreen";
import RetrievalScreen from "../screens/RetrievalScreen";
import DiagnosticsScreen from "../screens/DiagnosticsScreen";
import ReviewQueueScreen from "../screens/ReviewQueueScreen";
import DbBrowserScreen from "../screens/DbBrowserScreen";
import GovernanceScreen from "../screens/GovernanceScreen";
import OrganizedOutputScreen from "../screens/OrganizedOutputScreen";
import DatasetsScreen from "../screens/DatasetsScreen";
import SettingsScreen from "../screens/SettingsScreen";
import { useNavigation } from "../state/navigationContext";
import { useSettings } from "../state/settingsContext";
import FirstRunGuide from "../components/FirstRunGuide";

function ScreenRouter() {
  const { activeScreen } = useNavigation();

  switch (activeScreen) {
    case "dashboard":
      return <DashboardScreen />;
    case "imports":
      return <ImportsScreen />;
    case "activity-log":
      return <ActivityLogScreen />;
    case "retrieval":
      return <RetrievalScreen />;
    case "organized-output":
      return <OrganizedOutputScreen />;
    case "datasets":
      return <DatasetsScreen />;
    case "tiered-db":
      return <DbBrowserScreen />;
    case "review-queue":
      return <ReviewQueueScreen />;
    case "diagnostics":
      return <DiagnosticsScreen />;
    case "governance":
      return <GovernanceScreen />;
    case "settings":
      return <SettingsScreen />;
    default:
      return <DashboardScreen />;
  }
}

export default function AppShell() {
  const { activeScreen, setActiveScreen } = useNavigation();
  const { settings } = useSettings();
  const outputRootReady = settings.outputRootConfirmed && settings.outputRoot.trim().length > 0;

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-area">
        <Topbar />
        <div className="screen-area">
          {outputRootReady ? (
            <ScreenErrorBoundary
              key={activeScreen}
              screenId={activeScreen}
              onGoDashboard={() => setActiveScreen("dashboard")}
            >
              <ScreenRouter />
            </ScreenErrorBoundary>
          ) : (
            <section className="screen-grid">
              <div className="panel">
                <h2>Choose Output Folder</h2>
                <p className="muted">
                  Quantum needs a local workspace folder before imports, archive review, datasets, diagnostics, or governance can run reliably.
                </p>
                <p className="muted">
                  Use the first-run guide to choose where Quantum should store archives, datasets, diagnostics, and history on this machine.
                </p>
              </div>
            </section>
          )}
        </div>
      </main>
      <FirstRunGuide />
    </div>
  );
}
