import path from "node:path";
import { promises as fs } from "node:fs";
import { loadIndex, saveIndex } from "../index/indexStore.js";
import type { LocalIndexState } from "../index/state.js";
import { ensureDir, fileExists, writeTextFile } from "../utils/fs.js";

interface MergeAction {
  from_folder: string;
  to_folder: string;
  moved_files: string[];
  skipped_files: string[];
}

interface MergeReport {
  run_at: string;
  output_root: string;
  actions: MergeAction[];
}

function isSystemFolder(name: string): boolean {
  return [
    "archive",
    "backup",
    "purge",
    "restore_queue",
    "diagnostics",
    "datasets",
    "current"
  ].includes(name);
}

function parseTopicFromFolderName(folderName: string): string | null {
  const match = folderName.match(/^\d{4}-\d{2}_(.+)$/);
  return match ? match[1] : null;
}

function uniqueDestinationPath(basePath: string): string {
  const ext = path.extname(basePath);
  const stem = basePath.slice(0, -ext.length);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return stem + "_merged_" + timestamp + ext;
}

function resolveCanonicalTopic(topic: string, index: LocalIndexState): string {
  const cleaned = topic.trim().toLowerCase();

  const directGroup = index.groups.find(g => g.name.toLowerCase() === cleaned);
  if (directGroup) return directGroup.name;

  const aliasMatch = index.alias_memory
    .filter(a => a.alias === cleaned)
    .sort((a, b) => b.seen_count - a.seen_count)[0];

  if (aliasMatch) return aliasMatch.canonical_topic;

  const groupAliasMatch = index.groups.find(g =>
    g.aliases.some(alias => alias.trim().toLowerCase() === cleaned)
  );

  if (groupAliasMatch) return groupAliasMatch.name;

  return topic;
}

async function moveMarkdownFiles(
  sourceDir: string,
  targetDir: string
): Promise<{ moved: string[]; skipped: string[] }> {
  await ensureDir(targetDir);

  const entries = await fs.readdir(sourceDir, { withFileTypes: true });
  const moved: string[] = [];
  const skipped: string[] = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.toLowerCase().endsWith(".md")) continue;

    const sourcePath = path.join(sourceDir, entry.name);
    let destinationPath = path.join(targetDir, entry.name);

    if (await fileExists(destinationPath)) {
      destinationPath = uniqueDestinationPath(destinationPath);
    }

    try {
      await fs.rename(sourcePath, destinationPath);
      moved.push(destinationPath);
    } catch {
      skipped.push(sourcePath);
    }
  }

  return { moved, skipped };
}

async function removeIfEmpty(dirPath: string): Promise<void> {
  try {
    const entries = await fs.readdir(dirPath);
    if (entries.length === 0) {
      await fs.rmdir(dirPath);
    }
  } catch {
    // ignore
  }
}

async function main(): Promise<void> {
  const outputRoot = process.argv[2] || "organized_output";
  const index = await loadIndex(outputRoot);

  const entries = await fs.readdir(outputRoot, { withFileTypes: true });
  const folderNames = entries
    .filter(e => e.isDirectory())
    .map(e => e.name)
    .filter(name => !isSystemFolder(name));

  const report: MergeReport = {
    run_at: new Date().toISOString(),
    output_root: outputRoot,
    actions: []
  };

  for (const folderName of folderNames) {
    const rawTopic = parseTopicFromFolderName(folderName);
    if (!rawTopic) continue;

    const canonicalTopic = resolveCanonicalTopic(rawTopic, index);
    if (canonicalTopic === rawTopic) continue;

    const monthPrefix = folderName.slice(0, 7);
    const targetFolderName = monthPrefix + "_" + canonicalTopic;

    if (targetFolderName === folderName) continue;

    const sourceDir = path.join(outputRoot, folderName);
    const targetDir = path.join(outputRoot, targetFolderName);

    const result = await moveMarkdownFiles(sourceDir, targetDir);

    if (result.moved.length > 0 || result.skipped.length > 0) {
      report.actions.push({
        from_folder: sourceDir,
        to_folder: targetDir,
        moved_files: result.moved,
        skipped_files: result.skipped
      });
    }

    await removeIfEmpty(sourceDir);

    const sourceGroup = index.groups.find(g => g.name === rawTopic);
    const targetGroup = index.groups.find(g => g.name === canonicalTopic);

    if (sourceGroup && targetGroup && sourceGroup !== targetGroup) {
      for (const alias of sourceGroup.aliases) {
        if (!targetGroup.aliases.includes(alias)) {
          targetGroup.aliases.push(alias);
        }
      }

      for (const conversationId of sourceGroup.conversationIds) {
        if (!targetGroup.conversationIds.includes(conversationId)) {
          targetGroup.conversationIds.push(conversationId);
        }
      }

      for (const filePath of [...sourceGroup.filePaths, ...result.moved]) {
        if (!targetGroup.filePaths.includes(filePath)) {
          targetGroup.filePaths.push(filePath);
        }
      }

      index.groups = index.groups.filter(g => g !== sourceGroup);
    }
  }

  await saveIndex(outputRoot, index);

  const reportPath = path.join(outputRoot, "diagnostics", "folder-merge-report.json");
  await ensureDir(path.dirname(reportPath));
  await writeTextFile(reportPath, JSON.stringify(report, null, 2));

  console.log("Folder merge completed.");
  console.log({
    outputRoot,
    mergeActions: report.actions.length,
    reportPath
  });
}

main().catch((error) => {
  console.error("Folder merge failed:", error);
  process.exit(1);
});
