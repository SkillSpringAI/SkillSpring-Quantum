import path from "node:path";

export function normalizeFsPath(input: string): string {
  return input.trim().replace(/^["']|["']$/g, "");
}

export function resolveOutputRoot(outputRoot?: string): string {
  return normalizeFsPath(outputRoot || "organized_output");
}

export function resolveInputFile(filePath?: string): string | undefined {
  if (!filePath) return undefined;
  return normalizeFsPath(filePath);
}

export function resolveDesktopExportFolder(): string {
  return path.join(process.env.USERPROFILE || "", "Desktop", "ChatGPT Exports");
}

export function dbRoot(outputRoot: string): string {
  return path.join(resolveOutputRoot(outputRoot), "db");
}

export function diagnosticsRoot(outputRoot: string): string {
  return path.join(resolveOutputRoot(outputRoot), "diagnostics");
}
