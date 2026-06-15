import path from "node:path";
import { promises as fs } from "node:fs";

export interface GovernanceWriteReport {
  written_at: string;
  file_path: string;
  backup_path: string;
  bytes_written: number;
  diagnostics_triggered: boolean;
}

function reportsDir(): string {
  return path.resolve("governance", "logs", "writes");
}

export async function writeGovernanceWriteReport(
  report: GovernanceWriteReport
): Promise<string> {
  const dir = reportsDir();
  await fs.mkdir(dir, { recursive: true });

  const timestamp = report.written_at.replace(/[:.]/g, "-");
  const filePath = path.join(dir, "governance-write-" + timestamp + ".json");

  await fs.writeFile(filePath, JSON.stringify(report, null, 2) + "\n", "utf-8");
  await fs.writeFile(
    path.join(dir, "latest-governance-write.json"),
    JSON.stringify(report, null, 2) + "\n",
    "utf-8"
  );

  return filePath;
}
