import type { ImportJobForm, ImportRunResult } from "../types/imports";
import { runBatch, runFile } from "./desktopBridge";

export async function submitImportJob(
  form: ImportJobForm
): Promise<ImportRunResult> {
  if (form.mode === "single_file") {
    const response = await runFile({
      inputFile: form.inputFile,
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
      message: response.message ?? "Single-file import submitted."
    };
  }

  const response = await runBatch({
    inputFolder: form.inputFolder,
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
    message: response.message ?? "Batch import submitted."
  };
}
