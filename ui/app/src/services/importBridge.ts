import type { ImportJobForm, ImportRunResult, ImportSourceSummary } from "../types/imports";
import { inspectImportPath, pickDesktopFile, pickDesktopFolder, runImportPath } from "./desktopBridge";

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
      message: response.error
    };
  }

  return {
    ok: true,
    message: response.message ?? "Import submitted."
  };
}

export async function inspectSourcePath(inputPath: string): Promise<ImportSourceSummary | null> {
  const response = await inspectImportPath({ inputPath });

  if (!response.ok) {
    console.error("Import source inspection failed:", response.error);
    return null;
  }

  return response.result as ImportSourceSummary;
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

export function clearSourceSummaryForModeChange(form: ImportJobForm): ImportJobForm {
  return form.mode === "single_file"
    ? { ...form, inputFolder: "" }
    : { ...form, inputFile: "" };
}
