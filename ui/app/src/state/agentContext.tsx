import React, { createContext, useContext, useMemo, useState } from "react";
import type { ScreenId } from "./navigation";

export interface AgentArtifactContext {
  screen: ScreenId;
  kind: "screen" | "import_run" | "archive_file" | "dataset_preview" | "retrieval_result";
  title: string;
  path?: string;
  summary?: string;
  details?: string[];
}

interface AgentContextValue {
  currentArtifact: AgentArtifactContext | null;
  setCurrentArtifact: (artifact: AgentArtifactContext | null) => void;
}

const AgentContext = createContext<AgentContextValue | null>(null);

export function AgentContextProvider(props: { children: React.ReactNode }) {
  const [currentArtifact, setCurrentArtifact] = useState<AgentArtifactContext | null>(null);

  const value = useMemo(
    () => ({
      currentArtifact,
      setCurrentArtifact
    }),
    [currentArtifact]
  );

  return (
    <AgentContext.Provider value={value}>
      {props.children}
    </AgentContext.Provider>
  );
}

export function useAgentContext(): AgentContextValue {
  const ctx = useContext(AgentContext);
  if (!ctx) {
    throw new Error("useAgentContext must be used within AgentContextProvider");
  }
  return ctx;
}
