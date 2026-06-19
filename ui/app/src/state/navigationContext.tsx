import React, { createContext, useContext, useMemo, useState } from "react";
import type { ScreenId } from "./navigation";
import { SCREEN_LABELS } from "./navigation";
import type { RetrievalSavedRecordSelection, RetrievalSavedViewFilters } from "../types/retrievalSavedViews";

export interface RetrievalInvestigationIntent {
  filters: RetrievalSavedViewFilters;
  selectedRecord?: RetrievalSavedRecordSelection;
  suggestedName?: string;
}

interface NavigationContextValue {
  activeScreen: ScreenId;
  setActiveScreen: (screen: ScreenId) => void;
  activeLabel: string;
  retrievalIntent: RetrievalInvestigationIntent | null;
  openRetrievalInvestigation: (intent: RetrievalInvestigationIntent) => void;
  clearRetrievalIntent: () => void;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function NavigationProvider(props: { children: React.ReactNode }) {
  const [activeScreen, setActiveScreen] = useState<ScreenId>("dashboard");
  const [retrievalIntent, setRetrievalIntent] = useState<RetrievalInvestigationIntent | null>(null);

  const activeLabel = useMemo(() => {
    return SCREEN_LABELS[activeScreen] ?? "Dashboard";
  }, [activeScreen]);

  function openRetrievalInvestigation(intent: RetrievalInvestigationIntent) {
    setRetrievalIntent(intent);
    setActiveScreen("retrieval");
  }

  function clearRetrievalIntent() {
    setRetrievalIntent(null);
  }

  return (
    <NavigationContext.Provider
      value={{
        activeScreen,
        setActiveScreen,
        activeLabel,
        retrievalIntent,
        openRetrievalInvestigation,
        clearRetrievalIntent
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
