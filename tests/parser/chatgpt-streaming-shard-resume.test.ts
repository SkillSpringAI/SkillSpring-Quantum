import assert from "node:assert";
import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";
import chatgptFixture from "../fixtures/sample-chatgpt-conversation.json" with { type: "json" };
import { runConversationPipeline } from "../../core/pipeline/pipeline.js";
import { sha256 } from "../../core/utils/hash.js";

const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "chatgpt-streaming-resume-"));

try {
  const outputRoot = path.join(tempRoot, "output");
  const exportFile = path.join(tempRoot, "conversations-000.json");
  const secondConversation = JSON.parse(JSON.stringify(chatgptFixture)) as Record<string, unknown>;
  secondConversation.id = "fixture-conversation-002";
  secondConversation.conversation_id = "fixture-conversation-002";
  secondConversation.title = "Second fixture conversation";

  await fs.writeFile(
    exportFile,
    JSON.stringify([chatgptFixture, secondConversation], null, 2),
    "utf-8"
  );

  const progressPath = path.join(
    outputRoot,
    "imports",
    "streaming-shard-progress",
    sha256(path.normalize(exportFile).toLowerCase()) + ".json"
  );
  await fs.mkdir(path.dirname(progressPath), { recursive: true });
  await fs.writeFile(
    progressPath,
    JSON.stringify({
      sourcePath: exportFile,
      updatedAt: new Date().toISOString(),
      completedConversationIds: [String((chatgptFixture as Record<string, unknown>).conversation_id ?? (chatgptFixture as Record<string, unknown>).id)]
    }, null, 2),
    "utf-8"
  );

  const diagnostics = await runConversationPipeline(exportFile, outputRoot);

  assert.equal(diagnostics.status, "success", "Expected resumed streaming shard run to succeed");
  assert.equal(diagnostics.conversations_found, 1, "Expected resumed streaming shard run to skip the checkpointed conversation");

  await assert.rejects(
    () => fs.access(progressPath),
    "Expected streaming shard progress file to be removed after successful completion"
  );
} finally {
  await fs.rm(tempRoot, { recursive: true, force: true });
}

console.log("chatgpt-streaming-shard-resume.test.ts passed");
