import assert from "node:assert";
import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";
import { pathToFileURL } from "node:url";

const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "quantum-redaction-runtime-"));
const governanceRoot = path.join(tempRoot, "rules");
const previousGovernanceRoot = process.env.SSQ_GOVERNANCE_ROOT;

try {
  await fs.mkdir(governanceRoot, { recursive: true });
  await fs.writeFile(
    path.join(governanceRoot, "redaction-rules.json"),
    JSON.stringify(
      {
        version: "redaction-rules.test",
        hard_private_patterns: ["internal codename"],
        redaction_targets: ["email"],
        private_review_triggers: {
          redaction_count_min: 1,
          strong_flags: ["email"]
        }
      },
      null,
      2
    ),
    "utf-8"
  );

  process.env.SSQ_GOVERNANCE_ROOT = governanceRoot;

  const redactionModuleUrl =
    pathToFileURL(path.resolve("core", "pipeline", "redaction.ts")).href + "?ts=" + Date.now();
  const signalModuleUrl =
    pathToFileURL(path.resolve("core", "pipeline", "signalScorer.ts")).href + "?ts=" + Date.now();

  const { redactText } = await import(redactionModuleUrl);
  const { assessSegmentSignal } = await import(signalModuleUrl);

  const redacted = redactText("internal codename appears here alongside tester@example.com and 555-0000");
  assert.ok(
    redacted.text.includes("[REDACTED_PRIVATE_PATTERN]"),
    "Expected custom hard private phrases to be redacted from runtime rules"
  );
  assert.ok(
    redacted.text.includes("[REDACTED_EMAIL]"),
    "Expected enabled runtime email redaction to apply"
  );
  assert.ok(
    redacted.text.includes("555-0000"),
    "Expected phone text to remain because phone was not enabled in the runtime rule targets"
  );
  assert.ok(
    redacted.flags.includes("hard_private_pattern"),
    "Expected runtime custom phrase redaction to report the hard_private_pattern flag"
  );

  const assessment = assessSegmentSignal(
    {
      conversationId: "conversation-1",
      title: "Test",
      topic: "general",
      rawTopic: "general",
      summaryLabel: "Test",
      messages: [
        {
          role: "user",
          text: "internal codename appears here alongside tester@example.com",
          timestamp: "2026-07-18T00:00:00.000Z"
        }
      ],
      startIndex: 0,
      endIndex: 0,
      createdAt: "2026-07-18T00:00:00.000Z"
    },
    redacted.flags,
    redacted.redactionCount
  );

  assert.equal(
    assessment.tier,
    "private_review",
    "Expected runtime redaction rule hits to promote the segment into private review"
  );
} finally {
  if (previousGovernanceRoot === undefined) {
    delete process.env.SSQ_GOVERNANCE_ROOT;
  } else {
    process.env.SSQ_GOVERNANCE_ROOT = previousGovernanceRoot;
  }

  await fs.rm(tempRoot, { recursive: true, force: true });
}

console.log("redaction-runtime.test.ts passed");
