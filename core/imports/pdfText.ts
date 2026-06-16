import { promises as fs } from "node:fs";
import { inflateSync } from "node:zlib";

export interface PdfTextExtractionResult {
  ok: boolean;
  text: string;
  warnings: string[];
}

export async function extractPdfText(filePath: string): Promise<PdfTextExtractionResult> {
  const buffer = await fs.readFile(filePath);
  const warnings: string[] = [];
  const texts: string[] = [];

  const streamRegex = /<<(.*?)>>[\r\n\s]*stream\r?\n([\s\S]*?)\r?\nendstream/gi;
  let match: RegExpExecArray | null;

  while ((match = streamRegex.exec(buffer.toString("latin1"))) !== null) {
    const dictionary = match[1] ?? "";
    const rawStream = Buffer.from(match[2] ?? "", "latin1");

    let streamText = "";
    try {
      const decoded = /\/FlateDecode\b/.test(dictionary)
        ? inflateSync(rawStream).toString("latin1")
        : rawStream.toString("latin1");

      streamText = extractTextOperators(decoded);
    } catch {
      warnings.push("Failed to decode one PDF stream.");
      continue;
    }

    if (streamText.trim()) {
      texts.push(streamText.trim());
    }
  }

  const text = texts
    .join("\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!text) {
    warnings.push("No extractable text found in PDF streams.");
  }

  return {
    ok: text.length > 0,
    text,
    warnings
  };
}

function extractTextOperators(input: string): string {
  const parts: string[] = [];

  const arrayRegex = /\[(.*?)\]\s*TJ/gs;
  for (const match of input.matchAll(arrayRegex)) {
    const segment = match[1] ?? "";
    const strings = [...segment.matchAll(/\((?:\\.|[^\\)])*\)/g)]
      .map((value) => decodePdfString(value[0].slice(1, -1)))
      .filter(Boolean);

    if (strings.length > 0) {
      parts.push(strings.join(""));
    }
  }

  const simpleRegex = /\((?:\\.|[^\\)])*\)\s*Tj/g;
  for (const match of input.matchAll(simpleRegex)) {
    const raw = match[0];
    const start = raw.indexOf("(");
    const end = raw.lastIndexOf(")");
    if (start >= 0 && end > start) {
      const decoded = decodePdfString(raw.slice(start + 1, end));
      if (decoded) {
        parts.push(decoded);
      }
    }
  }

  return parts
    .join("\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n");
}

function decodePdfString(value: string): string {
  let output = "";

  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];

    if (char !== "\\") {
      output += char;
      continue;
    }

    const next = value[i + 1];
    if (!next) break;

    switch (next) {
      case "n":
        output += "\n";
        i += 1;
        break;
      case "r":
        output += "\r";
        i += 1;
        break;
      case "t":
        output += "\t";
        i += 1;
        break;
      case "b":
        output += "\b";
        i += 1;
        break;
      case "f":
        output += "\f";
        i += 1;
        break;
      case "(":
      case ")":
      case "\\":
        output += next;
        i += 1;
        break;
      default:
        if (/[0-7]/.test(next)) {
          let octal = next;
          let consumed = 1;

          for (let j = i + 2; j < value.length && consumed < 3; j += 1) {
            if (!/[0-7]/.test(value[j])) break;
            octal += value[j];
            consumed += 1;
          }

          output += String.fromCharCode(parseInt(octal, 8));
          i += consumed;
          break;
        }

        output += next;
        i += 1;
        break;
    }
  }

  return output;
}
