import assert from "node:assert";
import {
  normalizeFsPath,
  resolveOutputRoot
} from "../../core/utils/paths.js";

assert.equal(normalizeFsPath('"C:\\test path\\file.json"'), "C:\\test path\\file.json");
assert.equal(resolveOutputRoot("custom_output"), "custom_output");

console.log("path-utils.test.ts passed");
