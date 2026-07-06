import assert from "node:assert";
import path from "node:path";
import { resolveAgentConfigDir } from "../../skillspring-quantum-agent/agent/core/agentFactory.js";

const configDir = resolveAgentConfigDir();

assert.ok(path.isAbsolute(configDir), "Expected agent config directory to resolve to an absolute path");
assert.ok(
  configDir.toLowerCase().includes(`${path.sep}skillspring-quantum-agent${path.sep}agent${path.sep}config`.toLowerCase()),
  "Expected resolved config directory to point at the nested agent config folder"
);

if (process.platform === "win32") {
  assert.ok(!/^[a-z]:\\[a-z]:\\/i.test(configDir), "Expected Windows path not to duplicate the drive prefix");
}

console.log("agent-config-path.test.ts passed");
