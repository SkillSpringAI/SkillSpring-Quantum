import AppShell from "./layout/AppShell";
import AppErrorBoundary from "./components/AppErrorBoundary";
import { NavigationProvider } from "./state/navigationContext";
import { SettingsProvider } from "./state/settingsContext";

export default function App() {
  return (
    <SettingsProvider>
      <NavigationProvider>
        <AppErrorBoundary>
          <AppShell />
        </AppErrorBoundary>
      </NavigationProvider>
    </SettingsProvider>
  );
}
