import AppShell from "./layout/AppShell";
import { NavigationProvider } from "./state/navigationContext";
import { SettingsProvider } from "./state/settingsContext";

export default function App() {
  return (
    <SettingsProvider>
      <NavigationProvider>
        <AppShell />
      </NavigationProvider>
    </SettingsProvider>
  );
}
