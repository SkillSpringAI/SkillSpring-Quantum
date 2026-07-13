import path from "node:path";
import { promises as fs } from "node:fs";
import { ensureDir, writeTextFile } from "../utils/fs.js";

export interface JsonlMalformedLine {
  lineNumber: number;
  raw: string;
  error: string;
}

export interface JsonlRecoveryResult<T> {
  records: T[];
  malformedLines: JsonlMalformedLine[];
  totalNonEmptyLines: number;
}

interface JsonlRecoveryDiagnostic {
  generated_at: string;
  context: string;
  source_file: string;
  malformed_line_count: number;
  malformed_lines: JsonlMalformedLine[];
}

export async function readJsonlFileWithRecovery<T>(
  filePath: string
): Promise<JsonlRecoveryResult<T>> {
  const raw = await fs.readFile(filePath, "utf-8");
  const lines = raw.split(/\r?\n/);
  const records: T[] = [];
  const malformedLines: JsonlMalformedLine[] = [];
  let totalNonEmptyLines = 0;

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return;
    }

    totalNonEmptyLines += 1;

    try {
      records.push(JSON.parse(trimmed) as T);
    } catch (error) {
      malformedLines.push({
        lineNumber: index + 1,
        raw: trimmed,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  return {
    records,
    malformedLines,
    totalNonEmptyLines
  };
}

export async function writeJsonlRecoveryDiagnostic(
  dbRoot: string,
  context: string,
  sourceFile: string,
  malformedLines: JsonlMalformedLine[]
): Promise<string> {
  const diagnosticsDir = path.join(dbRoot, "diagnostics");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filePath = path.join(diagnosticsDir, `${context}-${timestamp}.json`);
  const diagnostic: JsonlRecoveryDiagnostic = {
    generated_at: new Date().toISOString(),
    context,
    source_file: sourceFile,
    malformed_line_count: malformedLines.length,
    malformed_lines: malformedLines
  };

  await ensureDir(diagnosticsDir);
  await writeTextFile(filePath, JSON.stringify(diagnostic, null, 2));

  return filePath;
}
