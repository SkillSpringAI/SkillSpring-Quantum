import assert from "node:assert";
import { readFile } from "node:fs/promises";
import { parseCopilotActivityCsv } from "../../core/parser/index.js";

const fixture = await readFile(new URL("../fixtures/sample-copilot-activity.csv", import.meta.url), "utf-8");
const parsed = parseCopilotActivityCsv(fixture);

assert.equal(parsed.conversations.length, 2, "Expected Copilot parser to return two conversations");
assert.equal(parsed.conversations[0].source, "copilot", "Expected Copilot parser to preserve Copilot source");
assert.equal(parsed.conversations[0].participants.join(","), "user,assistant", "Expected Copilot parser to preserve basic participants");
assert.ok(parsed.conversations[0].messages.length > 0, "Expected Copilot parser to preserve messages");

console.log("copilot-parser.test.ts passed");
