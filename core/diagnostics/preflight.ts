import path from "node:path";
import { promises as fs } from "node:fs";
import { resolveInputFile, resolveOutputRoot } from "../utils/paths.js";

export interface PreflightResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  resolved: {
    inputFile?: string;
    outputRoot: string;
  };
}

export async function runPipelinePreflight(
  inputFile: string | undefined,
  outputRoot: string | undefined
): Promise<PreflightResult> {
  const resolvedInput = resolveInputFile(inputFile);
  const resolvedOutput = resolveOutputRoot(outputRoot);

  const errors: string[] = [];
  const warnings: string[] = [];

  if (!resolvedInput) {
    errors.push("Input file is missing.");
  } else {
    try {
      const stat = await fs.stat(resolvedInput);
      if (!stat.isFile()) {
        errors.push("Input path exists but is not a file: " + resolvedInput);
      }

      const extension = path.extname(resolvedInput).toLowerCase();
      if (extension !== ".json" && extension !== ".html" && extension !== ".csv") {
        warnings.push("Input file does not end in a recognized conversation extension (.json, .html, or .csv): " + resolvedInput);
      }
    } catch {
      errors.push("Input file not found: " + resolvedInput);
    }
  }

  if (!resolvedOutput) {
    errors.push("Output root could not be resolved.");
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    resolved: {
      inputFile: resolvedInput,
      outputRoot: resolvedOutput
    }
  };
}
