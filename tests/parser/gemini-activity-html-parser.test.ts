import assert from "node:assert";
import { readFile } from "node:fs/promises";
import { detectAndParseConversationExport } from "../../core/parser/index.js";

const fixture = await readFile(new URL("../fixtures/sample-gemini-activity.html", import.meta.url), "utf-8");
const detected = detectAndParseConversationExport(fixture);

assert.equal(detected.kind, "gemini_activity_html", "Expected Gemini HTML fixture to use Gemini activity parser");
assert.equal(detected.label, "Gemini My Activity export");
assert.equal(detected.parsed.conversations.length, 1, "Expected one recovered Gemini activity conversation");

const conversation = detected.parsed.conversations[0];
assert.equal(conversation.source, "gemini");
assert.equal(conversation.messages.length, 2, "Expected prompt and response messages");
assert.equal(
  conversation.messages[0].text,
  "Analyse project and give your opinion this is 2 days of work or 10 hours"
);
assert.equal(conversation.messages[0].attachments?.length, 1, "Expected attachment link to be recovered");
assert.equal(
  conversation.messages[1].text,
  "The attached zip contains too many files to process. For more information, see here."
);
assert.ok(conversation.createdAt, "Expected Gemini activity timestamp to be normalized");

const nonLocalFixture = `
<html><body>
  <div class="outer-cell">
    <div class="content-cell mdl-cell mdl-cell--6-col mdl-typography--body-1">
      Gemini Apps<br>
      Prompted Test prompt<br>
      <a href="local-file.pdf">Local file</a><br>
      <a href="chrome://newtab/">chrome://newtab/</a><br>
      June 19, 2026, 1:00:00 PM
      <p>Test response</p>
    </div>
  </div>
  Gemini Apps Activity
</body></html>
`;

const nonLocalDetected = detectAndParseConversationExport(nonLocalFixture);
assert.equal(nonLocalDetected.kind, "gemini_activity_html");
assert.equal(nonLocalDetected.parsed.conversations[0].messages[0].attachments?.length, 1, "Expected non-local links to be ignored");
assert.equal(nonLocalDetected.parsed.conversations[0].messages[0].attachments?.[0].id, "local-file.pdf");

console.log("gemini-activity-html-parser.test.ts passed");
