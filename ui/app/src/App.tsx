import AppShell from "./layout/AppShell";
import AppErrorBoundary from "./components/AppErrorBoundary";
import { NavigationProvider } from "./state/navigationContext";
import { SettingsProvider } from "./state/settingsContext";
import { AgentContextProvider } from "./state/agentContext";
import { ImportActivityProvider } from "./state/importActivityContext";

export default function App() {
  return (
    <SettingsProvider>
      <AgentContextProvider>
        <ImportActivityProvider>
          <NavigationProvider>
            <AppErrorBoundary>
              <AppShell />
            </AppErrorBoundary>
          </NavigationProvider>
        </ImportActivityProvider>
      </AgentContextProvider>
    </SettingsProvider>
  );
}
