import assert from "node:assert";
import { readFile } from "node:fs/promises";
import { parseCopilotActivityCsv } from "../../core/parser/index.js";

const fixture = await readFile(new URL("../fixtures/sample-copilot-activity.csv", import.meta.url), "utf-8");
const parsed = parseCopilotActivityCsv(fixture);

assert.equal(parsed.conversations.length, 2, "Expected two Copilot conversations");
assert.equal(parsed.conversations[0].source, "copilot", "Expected Copilot source");
assert.equal(parsed.conversations[0].title, "Playing Free Xbox Games on PC", "Expected title to map from Conversation column");
assert.equal(parsed.conversations[0].messages.length, 4, "Expected four messages in first conversation");
assert.equal(parsed.conversations[0].messages[0].role, "user", "Expected same-timestamp Human row to sort before AI row");
assert.equal(parsed.conversations[0].messages[1].role, "assistant", "Expected same-timestamp AI row to sort after Human row");
assert.ok(
  parsed.conversations[0].messages[1].text.includes("You can play free-to-play Xbox games"),
  "Expected Copilot message text to parse"
);

console.log("copilot-activity-csv-parser.test.ts passed");
