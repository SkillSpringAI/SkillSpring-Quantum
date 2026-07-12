import type { ImportJobForm, ImportRunResult, ImportSourceSummary, ImportProgressUpdate } from "../types/imports";
import { inspectImportPath, pickDesktopFile, pickDesktopFolder, runImportPath, stopImportPath, subscribeImportProgress } from "./desktopBridge";

interface PickResult {
  canceled?: boolean;
  path?: string | null;
}

export async function submitImportJob(
  form: ImportJobForm
): Promise<ImportRunResult> {
  const inputPath =
    form.mode === "single_file"
      ? form.inputFile
      : form.inputFolder;

  const response = await runImportPath({
    inputPath,
    outputRoot: form.outputRoot
  });

  if (!response.ok) {
    return {
      ok: false,
      message: response.error,
      stopped: /force-stopped|stopped by request/i.test(response.error)
    };
  }

  return {
    ok: true,
    message: response.message ?? "Import submitted."
  };
}

export async function stopImportJob(): Promise<ImportRunResult> {
  const response = await stopImportPath({
    reason: "Stopped by request from the Imports screen."
  });

  if (!response.ok) {
    return {
      ok: false,
      message: response.error
    };
  }

  return {
    ok: true,
    message: response.message ?? "Import stop requested.",
    stopped: true
  };
}

export async function inspectSourcePath(inputPath: string): Promise<ImportSourceSummary | null> {
  const response = await inspectImportPath({ inputPath });

  if (!response.ok) {
    throw new Error(response.error);
  }

  const result = response.result as Partial<ImportSourceSummary>;
  return {
    inputPath: result.inputPath ?? inputPath,
    inputType: result.inputType ?? "missing",
    totalFiles: result.totalFiles ?? 0,
    supportedFiles: result.supportedFiles ?? 0,
    unsupportedFiles: result.unsupportedFiles ?? 0,
    countsByKind: {
      chatgpt_export: result.countsByKind?.chatgpt_export ?? 0,
      conversation_json: result.countsByKind?.conversation_json ?? 0,
      gemini_activity_html: result.countsByKind?.gemini_activity_html ?? 0,
      json_document: result.countsByKind?.json_document ?? 0,
      text_document: result.countsByKind?.text_document ?? 0,
      pdf_document: result.countsByKind?.pdf_document ?? 0,
      unsupported: result.countsByKind?.unsupported ?? 0
    },
    notes: Array.isArray(result.notes) ? result.notes : [],
    sampleFiles: Array.isArray(result.sampleFiles) ? result.sampleFiles : [],
    vendorSummaries: Array.isArray(result.vendorSummaries) ? result.vendorSummaries : []
  };
}

export async function chooseImportFile(): Promise<string | null> {
  const response = await pickDesktopFile();
  if (!response.ok) return null;
  const result = response.result as PickResult;
  return result.canceled ? null : result.path ?? null;
}

export async function chooseFolder(): Promise<string | null> {
  const response = await pickDesktopFolder();
  if (!response.ok) return null;
  const result = response.result as PickResult;
  return result.canceled ? null : result.path ?? null;
}

export function activeImportPath(form: ImportJobForm): string {
  return form.mode === "single_file" ? form.inputFile : form.inputFolder;
}

export function updateActiveImportPath(form: ImportJobForm, nextPath: string): ImportJobForm {
  return form.mode === "single_file"
    ? { ...form, inputFile: nextPath }
    : { ...form, inputFolder: nextPath };
}

export function subscribeToImportProgress(
  listener: (update: ImportProgressUpdate) => void
): () => void {
  return subscribeImportProgress(listener);
}

export function clearSourceSummaryForModeChange(form: ImportJobForm): ImportJobForm {
  return form.mode === "single_file"
    ? { ...form, inputFolder: "" }
    : { ...form, inputFile: "" };
}
