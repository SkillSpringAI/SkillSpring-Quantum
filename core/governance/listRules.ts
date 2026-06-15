import path from "node:path";
import { listGovernanceRuleFiles, governanceRulesRoot } from "./fsRules.js";

async function main(): Promise<void> {
  const root = governanceRulesRoot();
  const files = await listGovernanceRuleFiles();

  const result = {
    rootPath: root,
    files: files.map((filePath) => ({
      name: path.basename(filePath),
      path: filePath
    }))
  };

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error("Governance list rules failed:", error);
  process.exit(1);
});
