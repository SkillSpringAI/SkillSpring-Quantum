import path from "node:path";
import { governanceRulesRoot, readGovernanceRuleFile } from "./fsRules.js";

function resolveRequestedPath(rawArg?: string): string {
  if (!rawArg) {
    throw new Error("Usage: npm run governance:read -- <filePath>");
  }

  if (path.isAbsolute(rawArg)) {
    return rawArg;
  }

  return path.join(governanceRulesRoot(), rawArg);
}

async function main(): Promise<void> {
  const filePath = resolveRequestedPath(process.argv[2]);
  const rawText = await readGovernanceRuleFile(filePath);

  console.log(JSON.stringify({
    filePath,
    rawText
  }, null, 2));
}

main().catch((error) => {
  console.error("Governance read rule failed:", error);
  process.exit(1);
});
