import assert from "node:assert";
import { fingerprintRecord } from "../../core/db/fingerprintStore.js";

const a = { x: 1, y: "test" };
const b = { x: 1, y: "test" };
const c = { x: 2, y: "test" };

const fa = fingerprintRecord(a);
const fb = fingerprintRecord(b);
const fc = fingerprintRecord(c);

assert.ok(fa === fb, "Expected identical records to share fingerprint");
assert.ok(fa !== fc, "Expected different records to have different fingerprints");

console.log("db-fingerprint.test.ts passed");
