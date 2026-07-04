import assert from "node:assert";
import { listSupportedCommands, parseSupportedCommand } from "../../ui/app/src/services/commandCatalog";

const commands = listSupportedCommands();
assert.ok(commands.some((command) => command.name === "inspect_export"), "Expected inspect command to be listed");
assert.ok(commands.some((command) => command.name === "search_completed_outputs"), "Expected search command to be listed");

const inspect = parseSupportedCommand("check this export C:\\Exports\\claude");
assert.equal(inspect?.command, "inspect_export");
assert.equal(inspect?.path, "C:\\Exports\\claude");

const importRun = parseSupportedCommand("run import C:\\Exports\\chat.json");
assert.equal(importRun?.command, "import_export");
assert.equal(importRun?.path, "C:\\Exports\\chat.json");

const search = parseSupportedCommand("find the conversation about docker ports from claude");
assert.equal(search?.command, "search_completed_outputs");
assert.equal(search?.vendor, "claude");
assert.ok(search?.searchText?.toLowerCase().includes("docker ports"), "Expected search text to retain clue words");

const archive = parseSupportedCommand("open archive");
assert.equal(archive?.command, "open_archive");

console.log("command-catalog.test.ts passed");
