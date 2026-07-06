export type ModelSelectionReason = "requested" | "compatible" | "fallback";

export interface ModelSelectionResult {
  selectedModel: string | null;
  reason: ModelSelectionReason | null;
  installedModels: string[];
}

interface ModelSelectionOptions {
  requestedModel: string;
  installedModels: string[];
  compatibleModels?: string[];
  fallbackToFirstAvailable?: boolean;
  allowAnyInstalledFallback?: boolean;
}

function normalizeModelName(model: string): string {
  return model.trim().toLowerCase();
}

function baseModelName(model: string): string {
  return normalizeModelName(model).split(":")[0];
}

export function isCompatibleModel(installedModel: string, configuredModel: string): boolean {
  const installed = normalizeModelName(installedModel);
  const configured = normalizeModelName(configuredModel);

  return (
    installed === configured ||
    installed.startsWith(`${configured}:`) ||
    baseModelName(installed) === configured ||
    installed === baseModelName(configured)
  );
}

export function selectBestAvailableModel(options: ModelSelectionOptions): ModelSelectionResult {
  const installedModels = options.installedModels.filter(Boolean);
  const requestedModel = options.requestedModel.trim();
  const compatibleModels = options.compatibleModels?.filter(Boolean) ?? [];

  const requestedMatch = installedModels.find((model) => isCompatibleModel(model, requestedModel));
  if (requestedMatch) {
    return {
      selectedModel: requestedMatch,
      reason: "requested",
      installedModels,
    };
  }

  for (const compatibleModel of compatibleModels) {
    const compatibleMatch = installedModels.find((model) => isCompatibleModel(model, compatibleModel));
    if (compatibleMatch) {
      return {
        selectedModel: compatibleMatch,
        reason: "compatible",
        installedModels,
      };
    }
  }

  if (options.fallbackToFirstAvailable && options.allowAnyInstalledFallback && installedModels.length > 0) {
    return {
      selectedModel: installedModels[0],
      reason: "fallback",
      installedModels,
    };
  }

  return {
    selectedModel: null,
    reason: null,
    installedModels,
  };
}

export function isModelMissingError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /model/i.test(message) && /not found/i.test(message);
}
