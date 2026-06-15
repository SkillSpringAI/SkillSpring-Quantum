import AppShell from "./layout/AppShell";
import { NavigationProvider } from "./state/navigationContext";

export default function App() {
  return (
    <NavigationProvider>
      <AppShell />
    </NavigationProvider>
  );
}
