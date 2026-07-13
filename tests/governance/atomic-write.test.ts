import assert from "node:assert";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { writeTextFile } from "../../core/utils/fs.js";

async function main(): Promise<void> {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "quantum-atomic-write-"));

  try {
    await verifiesReplacementWrite(tempRoot);
    await verifiesFreshWrite(tempRoot);
    console.log("atomic-write.test.ts passed");
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

async function verifiesReplacementWrite(tempRoot: string): Promise<void> {
  const filePath = path.join(tempRoot, "state", "latest.json");
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, '{"status":"old"}\n', "utf-8");

  await writeTextFile(filePath, '{"status":"new","count":2}\n');

  const finalContent = await fs.readFile(filePath, "utf-8");
  assert.equal(
    finalContent,
    '{"status":"new","count":2}\n',
    "Expected atomic write to fully replace existing file content"
  );

  const siblingNames = await fs.readdir(path.dirname(filePath));
  assert.deepEqual(
    siblingNames,
    ["latest.json"],
    "Expected atomic replacement to leave no temporary sibling files behind"
  );
}

async function verifiesFreshWrite(tempRoot: string): Promise<void> {
  const filePath = path.join(tempRoot, "manifests", "run.json");

  await writeTextFile(filePath, '{"created":true}\n');

  const finalContent = await fs.readFile(filePath, "utf-8");
  assert.equal(finalContent, '{"created":true}\n', "Expected atomic write to create new files cleanly");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
