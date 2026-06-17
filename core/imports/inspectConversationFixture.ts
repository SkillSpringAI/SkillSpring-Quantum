import { promises as fs } from "node:fs";
import path from "node:path";
import { detectAndParseConversationExport } from "../parser/index.js";
import { resolveInputFile } from "../utils/paths.js";

async function main(): Promise<void> {
  const filePath = resolveInputFile(process.argv[2]);

  if (!filePath) {
    console.error("Usage: tsx core/imports/inspectConversationFixture.ts <inputFile>");
    process.exit(1);
  }

  const rawText = await fs.readFile(filePath, "utf-8");
  const parsedJson = JSON.parse(rawText);
  const detected = detectAndParseConversationExport(parsedJson);

  const sampleConversation = detected.parsed.conversations[0];

  console.log(JSON.stringify({
    filePath,
    fileName: path.basename(filePath),
    parserKind: detected.kind,
    parserLabel: detected.label,
    diagnostics: detected.diagnostics,
    conversationCount: detected.parsed.conversations.length,
    sampleConversation: sampleConversation
      ? {
          id: sampleConversation.id,
          source: sampleConversation.source,
          title: sampleConversation.title,
          createdAt: sampleConversation.createdAt,
          messageCount: sampleConversation.messages.length,
          sampleRoles: [...new Set(sampleConversation.messages.map((message) => message.role))],
          firstMessages: sampleConversation.messages.slice(0, 3)
        }
      : null
  }, null, 2));
}

main().catch((error) => {
  console.error("Conversation fixture inspection failed:", error);
  process.exit(1);
});
