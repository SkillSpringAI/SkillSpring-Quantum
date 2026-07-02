import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import ScreenErrorBoundary from "../components/ScreenErrorBoundary";
import DashboardScreen from "../screens/DashboardScreen";
import ImportsScreen from "../screens/ImportsScreen";
import RetrievalScreen from "../screens/RetrievalScreen";
import DiagnosticsScreen from "../screens/DiagnosticsScreen";
import ReviewQueueScreen from "../screens/ReviewQueueScreen";
import DbBrowserScreen from "../screens/DbBrowserScreen";
import GovernanceScreen from "../screens/GovernanceScreen";
import OrganizedOutputScreen from "../screens/OrganizedOutputScreen";
import DatasetsScreen from "../screens/DatasetsScreen";
import SettingsScreen from "../screens/SettingsScreen";
import { useNavigation } from "../state/navigationContext";
import FirstRunGuide from "../components/FirstRunGuide";

function ScreenRouter() {
  const { activeScreen } = useNavigation();

  switch (activeScreen) {
    case "dashboard":
      return <DashboardScreen />;
    case "imports":
      return <ImportsScreen />;
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

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-area">
        <Topbar />
        <div className="screen-area">
          <ScreenErrorBoundary
            key={activeScreen}
            screenId={activeScreen}
            onGoDashboard={() => setActiveScreen("dashboard")}
          >
            <ScreenRouter />
          </ScreenErrorBoundary>
        </div>
      </main>
      <FirstRunGuide />
    </div>
  );
}
