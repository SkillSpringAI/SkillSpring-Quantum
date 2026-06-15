import assert from "node:assert";
import { writeGovernanceWriteReport } from "../../core/governance/writeReport.js";

const run = async () => {
  const filePath = await writeGovernanceWriteReport({
    written_at: new Date().toISOString(),
    file_path: "governance/rules/example.json",
    backup_path: "governance/logs/backups/example.bak.json",
    bytes_written: 42,
    diagnostics_triggered: false
  });

  assert.ok(filePath.includes("governance-write-"), "Expected governance write report filename");
  console.log("governance-write-report.test.ts passed");
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
