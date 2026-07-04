import assert from "node:assert";
import os from "node:os";
import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { fileExists, readJsonFile } from "../../core/utils/fs.js";
import { runImportSource, type ImportRunSummary } from "../../core/imports/sourceIntake.js";
import type { ImportRetrievalIndexManifest } from "../../core/imports/importRetrievalIndex.js";

interface VendorSmokeCase {
  label: string;
  vendor: "chatgpt" | "claude" | "gemini" | "grok" | "copilot";
  inputPath: string;
}

const tempRoot = await mkdtemp(path.join(os.tmpdir(), "skillspring-vendor-smoke-"));

const cases: VendorSmokeCase[] = [
  {
    label: "ChatGPT export",
    vendor: "chatgpt",
    inputPath: fileURLToPath(new URL("../fixtures/sample-chatgpt-conversation.json", import.meta.url))
  },
  {
    label: "Claude export",
    vendor: "claude",
    inputPath: fileURLToPath(new URL("../fixtures/sample-claude-conversation.json", import.meta.url))
  },
  {
    label: "Gemini export",
    vendor: "gemini",
    inputPath: fileURLToPath(new URL("../fixtures/sample-gemini-conversation.json", import.meta.url))
  },
  {
    label: "Grok export",
    vendor: "grok",
    inputPath: fileURLToPath(new URL("../fixtures/sample-grok-export.json", import.meta.url))
  },
  {
    label: "Microsoft Copilot activity export",
    vendor: "copilot",
    inputPath: fileURLToPath(new URL("../fixtures/sample-copilot-activity.csv", import.meta.url))
  }
];

try {
  for (const testCase of cases) {
    const outputRoot = path.join(tempRoot, testCase.vendor);
    const result = await runImportSource(testCase.inputPath, outputRoot);

    assertRunSucceeded(testCase, result);

    assert.ok(await fileExists(result.historyPath), `Expected ${testCase.label} to write import history.`);
    assert.ok(
      await fileExists(path.join(outputRoot, "imports", "latest-import-run.json")),
      `Expected ${testCase.label} to update latest import history.`
    );
    assert.ok(
      await fileExists(path.join(outputRoot, "db", "manifests", "latest-source-import.json")),
      `Expected ${testCase.label} to update latest source import manifest.`
    );
    assert.ok(
      await fileExists(path.join(outputRoot, "imports", "latest-retrieval-index.json")),
      `Expected ${testCase.label} to update latest retrieval index.`
    );

    const retrievalIndex = await readJsonFile<ImportRetrievalIndexManifest>(
      path.join(outputRoot, "imports", "latest-retrieval-index.json")
    );
    assert.ok(
      retrievalIndex.vendorSources.includes(testCase.vendor),
      `Expected ${testCase.label} retrieval index to include vendor ${testCase.vendor}.`
    );
    assert.ok(
      result.artifacts.some((artifact) => artifact.label === "Output root" && artifact.path === outputRoot),
      `Expected ${testCase.label} artifacts to include the output root.`
    );
  }
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}

console.log("vendor-import-smoke.test.ts passed");

function assertRunSucceeded(testCase: VendorSmokeCase, result: ImportRunSummary) {
  assert.equal(result.filesImported, 1, `Expected ${testCase.label} to import one source file.`);
  assert.equal(result.filesFailed, 0, `Expected ${testCase.label} to import without failures.`);
  assert.ok(result.retrievalSummary, `Expected ${testCase.label} to produce a retrieval summary.`);
  assert.ok(
    result.retrievalSummary?.vendorSources.includes(testCase.vendor),
    `Expected ${testCase.label} retrieval summary to include vendor ${testCase.vendor}.`
  );
  assert.ok(
    result.results.some((entry) => entry.status === "imported"),
    `Expected ${testCase.label} results to contain an imported entry.`
  );
}
