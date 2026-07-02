import React, { createContext, useContext, useEffect, useState } from "react";

const SETTINGS_KEY = "skillspring-quantum-settings";

export interface AppSettings {
  outputRoot: string;
  onboardingDismissed: boolean;
}

interface SettingsContextValue {
  settings: AppSettings;
  updateSettings: (next: Partial<AppSettings>) => void;
  dismissOnboarding: () => void;
  reopenOnboarding: () => void;
}

const defaultSettings: AppSettings = {
  outputRoot: "organized_output",
  onboardingDismissed: false
};

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppSettings>;
      return {
        outputRoot: parsed.outputRoot ?? defaultSettings.outputRoot,
        onboardingDismissed: parsed.onboardingDismissed ?? defaultSettings.onboardingDismissed
      };
    }
  } catch {
    // fall through to default
  }
  return { ...defaultSettings };
}

function saveSettings(settings: AppSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore localStorage errors
  }
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider(props: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  function updateSettings(next: Partial<AppSettings>) {
    setSettings((current) => ({ ...current, ...next }));
  }

  function dismissOnboarding() {
    setSettings((current) => ({ ...current, onboardingDismissed: true }));
  }

  function reopenOnboarding() {
    setSettings((current) => ({ ...current, onboardingDismissed: false }));
  }

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, dismissOnboarding, reopenOnboarding }}>
      {props.children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("useSettings must be used within SettingsProvider");
  }
  return ctx;
}
