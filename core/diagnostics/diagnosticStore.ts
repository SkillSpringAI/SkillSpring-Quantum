import path from "node:path";
import type { RunDiagnostics } from "./types.js";
import { ensureDir, writeTextFile } from "../utils/fs.js";

function stampForFile(date: Date): string {
  return date.toISOString().replace(/[:.]/g, "-");
}

export async function writeDiagnostics(rootOutputDir: string, diagnostics: RunDiagnostics): Promise<void> {
  const diagnosticsDir = path.join(rootOutputDir, "diagnostics");
  const historyDir = path.join(diagnosticsDir, "history");
  const failuresDir = path.join(diagnosticsDir, "failures");

  await ensureDir(historyDir);
  await ensureDir(failuresDir);

  const latestPath = path.join(diagnosticsDir, "latest-run.json");
  const historyPath = path.join(historyDir, diagnostics.run_id + ".json");

  await writeTextFile(latestPath, JSON.stringify(diagnostics, null, 2));
  await writeTextFile(historyPath, JSON.stringify(diagnostics, null, 2));

  if (diagnostics.status === "failed") {
    const failurePath = path.join(
      failuresDir,
      diagnostics.run_id + "-" + stampForFile(new Date()) + ".json"
    );
    await writeTextFile(failurePath, JSON.stringify(diagnostics, null, 2));
  }
}
