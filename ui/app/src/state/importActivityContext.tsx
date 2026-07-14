import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { subscribeToImportProgress } from "../services/importBridge";
import type { ImportProgressUpdate, RunLogEntry, RunState } from "../types/imports";

interface ImportActivityContextValue {
  runState: RunState;
  setRunState: React.Dispatch<React.SetStateAction<RunState>>;
  statusMessage: string;
  setStatusMessage: React.Dispatch<React.SetStateAction<string>>;
  importProgress: ImportProgressUpdate | null;
  setImportProgress: React.Dispatch<React.SetStateAction<ImportProgressUpdate | null>>;
  logEntries: RunLogEntry[];
  appendLogEntry: (level: RunLogEntry["level"], message: string) => void;
}

const ImportActivityContext = createContext<ImportActivityContextValue | null>(null);

function makeLogEntry(
  level: RunLogEntry["level"],
  message: string
): RunLogEntry {
  return {
    id: crypto.randomUUID(),
    level,
    message,
    timestamp: new Date().toLocaleTimeString()
  };
}

export function ImportActivityProvider(props: { children: React.ReactNode }) {
  const [runState, setRunState] = useState<RunState>("idle");
  const [statusMessage, setStatusMessage] = useState("Ready to inspect or import.");
  const [importProgress, setImportProgress] = useState<ImportProgressUpdate | null>(null);
  const [logEntries, setLogEntries] = useState<RunLogEntry[]>([]);

  const appendLogEntry = useCallback((level: RunLogEntry["level"], message: string) => {
    setLogEntries((prev) => [makeLogEntry(level, message), ...prev]);
  }, []);

  useEffect(() => {
    return subscribeToImportProgress((update) => {
      setImportProgress(update);
      setRunState("running");
      setStatusMessage(update.message);
      setLogEntries((prev) => {
        if (prev[0]?.message === update.message) {
          return prev;
        }

        return [makeLogEntry("info", update.message), ...prev];
      });
    });
  }, []);

  const value = useMemo<ImportActivityContextValue>(
    () => ({
      runState,
      setRunState,
      statusMessage,
      setStatusMessage,
      importProgress,
      setImportProgress,
      logEntries,
      appendLogEntry
    }),
    [runState, statusMessage, importProgress, logEntries, appendLogEntry]
  );

  return (
    <ImportActivityContext.Provider value={value}>
      {props.children}
    </ImportActivityContext.Provider>
  );
}

export function useImportActivity(): ImportActivityContextValue {
  const ctx = useContext(ImportActivityContext);

  if (!ctx) {
    throw new Error("useImportActivity must be used within ImportActivityProvider");
  }

  return ctx;
}
