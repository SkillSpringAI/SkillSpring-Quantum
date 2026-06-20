import React, { createContext, useContext, useMemo, useState } from "react";
import type { ScreenId } from "./navigation";
import { SCREEN_LABELS } from "./navigation";
import type { RetrievalSavedRecordSelection, RetrievalSavedViewFilters } from "../types/retrievalSavedViews";
import type { DatasetInvestigationIntent } from "../utils/datasetIntent";

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
  datasetIntent: DatasetInvestigationIntent | null;
  openRetrievalInvestigation: (intent: RetrievalInvestigationIntent) => void;
  openDatasetInvestigation: (intent: DatasetInvestigationIntent) => void;
  clearRetrievalIntent: () => void;
  clearDatasetIntent: () => void;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function NavigationProvider(props: { children: React.ReactNode }) {
  const [activeScreen, setActiveScreen] = useState<ScreenId>("dashboard");
  const [retrievalIntent, setRetrievalIntent] = useState<RetrievalInvestigationIntent | null>(null);
  const [datasetIntent, setDatasetIntent] = useState<DatasetInvestigationIntent | null>(null);

  const activeLabel = useMemo(() => {
    return SCREEN_LABELS[activeScreen] ?? "Dashboard";
  }, [activeScreen]);

  function openRetrievalInvestigation(intent: RetrievalInvestigationIntent) {
    setRetrievalIntent(intent);
    setActiveScreen("retrieval");
  }

  function openDatasetInvestigation(intent: DatasetInvestigationIntent) {
    setDatasetIntent(intent);
    setActiveScreen("datasets");
  }

  function clearRetrievalIntent() {
    setRetrievalIntent(null);
  }

  function clearDatasetIntent() {
    setDatasetIntent(null);
  }

  return (
    <NavigationContext.Provider
      value={{
        activeScreen,
        setActiveScreen,
        activeLabel,
        retrievalIntent,
        datasetIntent,
        openRetrievalInvestigation,
        openDatasetInvestigation,
        clearRetrievalIntent,
        clearDatasetIntent
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
