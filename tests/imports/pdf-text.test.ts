import assert from "node:assert";
import { deflateSync } from "node:zlib";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { extractPdfText } from "../../core/imports/pdfText.js";

const tempDir = await mkdtemp(path.join(os.tmpdir(), "skillspring-pdf-test-"));

try {
  const pdfPath = path.join(tempDir, "sample.pdf");
  const stream = "BT\n/F1 12 Tf\n72 720 Td\n(Hello PDF World) Tj\n[(Line ) 120 (Two)] TJ\nET";
  const compressed = deflateSync(Buffer.from(stream, "latin1"));
  const pdf = [
    "%PDF-1.4",
    "1 0 obj",
    "<< /Length " + compressed.length + " /Filter /FlateDecode >>",
    "stream",
    compressed.toString("latin1"),
    "endstream",
    "endobj",
    "%%EOF"
  ].join("\n");

  await writeFile(pdfPath, pdf, "latin1");

  const result = await extractPdfText(pdfPath);
  assert.equal(result.ok, true);
  assert.ok(result.text.includes("Hello PDF World"));
  assert.ok(result.text.includes("Line Two"));
  console.log("pdf-text.test.ts passed");
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
