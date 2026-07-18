import path from "node:path";
import { promises as fs } from "node:fs";
import { validateGovernanceRuleFile } from "./validateRuleFile.js";

function stripBom(text: string): string {
  return text.replace(/^\uFEFF/, "");
}

function configuredGovernanceRoot(): string | undefined {
  const root = process.env.SSQ_GOVERNANCE_ROOT?.trim();
  return root ? root : undefined;
}

function configuredGovernanceLogRoot(): string | undefined {
  const root = process.env.SSQ_GOVERNANCE_LOG_ROOT?.trim();
  return root ? root : undefined;
}

export function governanceRulesRoot(): string {
  const root = configuredGovernanceRoot();
  return root
    ? path.resolve(root)
    : path.resolve("governance", "rules");
}

export function governanceBackupRoot(): string {
  const logRoot = configuredGovernanceLogRoot();
  return logRoot
    ? path.join(path.resolve(logRoot), "backups")
    : path.resolve("governance", "logs", "backups");
}

export function governanceWriteReportRoot(): string {
  const logRoot = configuredGovernanceLogRoot();
  return logRoot
    ? path.join(path.resolve(logRoot), "writes")
    : path.resolve("governance", "logs", "writes");
}

export function ensureInsideGovernanceRules(inputPath: string): string {
  const root = governanceRulesRoot();
  const resolved = path.resolve(inputPath);

  const relative = path.relative(root, resolved);
  const escapes =
    relative.startsWith("..") ||
    path.isAbsolute(relative) ||
    resolved === path.resolve("governance");

  if (escapes) {
    throw new Error("Path escapes governance/rules boundary: " + inputPath);
  }

  return resolved;
}

export async function listGovernanceRuleFiles(): Promise<string[]> {
  const root = governanceRulesRoot();
  const entries = await fs.readdir(root, { withFileTypes: true });

  return entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".json"))
    .map((e) => path.join(root, e.name))
    .sort();
}

export async function readGovernanceRuleFile(filePath: string): Promise<string> {
  const safePath = ensureInsideGovernanceRules(filePath);
  const raw = await fs.readFile(safePath, "utf-8");
  return stripBom(raw);
}

export async function backupGovernanceRuleFile(filePath: string): Promise<string> {
  const safePath = ensureInsideGovernanceRules(filePath);
  const backupRoot = governanceBackupRoot();

  await fs.mkdir(backupRoot, { recursive: true });

  const raw = await fs.readFile(safePath, "utf-8");
  const baseName = path.basename(safePath, ".json");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(backupRoot, baseName + "." + timestamp + ".bak.json");

  await fs.writeFile(backupPath, raw, "utf-8");
  return backupPath;
}

export async function writeGovernanceRuleFile(
  filePath: string,
  rawText: string
): Promise<number> {
  const safePath = ensureInsideGovernanceRules(filePath);

  validateGovernanceRuleFile(safePath, rawText);

  const finalText = rawText.endsWith("\n") ? rawText : rawText + "\n";
  await fs.writeFile(safePath, finalText, "utf-8");

  return Buffer.byteLength(finalText, "utf-8");
}
