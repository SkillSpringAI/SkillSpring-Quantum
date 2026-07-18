import { promises as fs } from "node:fs";
import path from "node:path";
import { looksLikeChatGptConversationArrayText } from "../parser/chatgpt.js";
import { fileExists } from "../utils/fs.js";

export interface PackageCompanionContext {
  package_companion_files?: number;
  package_companion_examples?: string[];
}

export async function readConversationImportSource(filePath: string): Promise<unknown> {
  const rawText = await fs.readFile(filePath, "utf-8");
  return [".html", ".csv"].includes(path.extname(filePath).toLowerCase()) ||
    looksLikeChatGptConversationArrayText(rawText)
    ? rawText
    : JSON.parse(rawText) as unknown;
}

export async function summarizePackageCompanionContext(
  filePath: string,
  detectedKind: string
): Promise<PackageCompanionContext> {
  const directory = path.dirname(filePath);

  if (detectedKind === "gemini_activity_html") {
    try {
      const entries = await fs.readdir(directory, { withFileTypes: true });
      const companionFiles = entries
        .filter((entry) => entry.isFile())
        .map((entry) => entry.name)
        .filter((name) => path.join(directory, name) !== filePath)
        .sort((left, right) => left.localeCompare(right));

      if (companionFiles.length > 0) {
        return {
          package_companion_files: companionFiles.length,
          package_companion_examples: companionFiles.slice(0, 3)
        };
      }
    } catch {
      return {};
    }
  }

  if (detectedKind === "claude_export") {
    const siblingUsersPath = path.join(directory, "users.json");
    const siblingConversationsPath = path.join(directory, "conversations.json");
    const normalizedFilePath = path.normalize(filePath).toLowerCase();

    if (
      normalizedFilePath === path.normalize(siblingConversationsPath).toLowerCase() &&
      await fileExists(siblingUsersPath)
    ) {
      return {
        package_companion_files: 1,
        package_companion_examples: ["users.json"]
      };
    }
  }

  return {};
}
