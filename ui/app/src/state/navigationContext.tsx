import React, { createContext, useContext, useMemo, useState } from "react";
import type { ScreenId } from "./navigation";
import { NAV_ITEMS } from "./navigation";

interface NavigationContextValue {
  activeScreen: ScreenId;
  setActiveScreen: (screen: ScreenId) => void;
  activeLabel: string;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function NavigationProvider(props: { children: React.ReactNode }) {
  const [activeScreen, setActiveScreen] = useState<ScreenId>("dashboard");

  const activeLabel = useMemo(() => {
    return NAV_ITEMS.find((item) => item.id === activeScreen)?.label ?? "Dashboard";
  }, [activeScreen]);

  return (
    <NavigationContext.Provider
      value={{
        activeScreen,
        setActiveScreen,
        activeLabel
      }}
    >
      {props.children}
    </NavigationContext.Provider>
  );
}

export function useNavigation(): NavigationContextValue {
  const ctx = useContext(NavigationContext);

  if (!ctx) {
    throw new Error("useNavigation must be used within NavigationProvider");
  }

  return ctx;
}
