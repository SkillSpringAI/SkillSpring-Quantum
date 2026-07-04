import AppShell from "./layout/AppShell";
import AppErrorBoundary from "./components/AppErrorBoundary";
import { NavigationProvider } from "./state/navigationContext";
import { SettingsProvider } from "./state/settingsContext";
import { AgentContextProvider } from "./state/agentContext";

export default function App() {
  return (
    <SettingsProvider>
      <AgentContextProvider>
        <NavigationProvider>
          <AppErrorBoundary>
            <AppShell />
          </AppErrorBoundary>
        </NavigationProvider>
      </AgentContextProvider>
    </SettingsProvider>
  );
}
