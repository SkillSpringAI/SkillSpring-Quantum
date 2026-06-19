import type { Conversation, ConversationAttachment, ParseResult } from "./types.js";

const GEMINI_ACTIVITY_MARKERS = [
  "Gemini Apps Activity",
  "Gemini Apps<br>",
  "Prompted"
];

export function parseGeminiActivityHtml(raw: unknown): ParseResult {
  if (typeof raw !== "string") {
    return { conversations: [] };
  }

  const normalized = raw.trim();
  if (!looksLikeGeminiActivityHtml(normalized)) {
    return { conversations: [] };
  }

  const conversations: Conversation[] = [];
  const chunks = normalized.split(/<div class="outer-cell\b/i).slice(1);

  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = "<div class=\"outer-cell" + chunks[index];
    const conversation = parseActivityChunk(chunk, index);
    if (conversation) {
      conversations.push(conversation);
    }
  }

  return { conversations };
}

function looksLikeGeminiActivityHtml(raw: string): boolean {
  return GEMINI_ACTIVITY_MARKERS.every((marker) => raw.includes(marker));
}

function parseActivityChunk(chunk: string, index: number): Conversation | null {
  if (!chunk.includes("Gemini Apps")) {
    return null;
  }

  const bodyMatch = chunk.match(
    /<div class="content-cell mdl-cell mdl-cell--6-col mdl-typography--body-1">(.*?)<\/div>/is
  );

  if (!bodyMatch) {
    return null;
  }

  const bodyHtml = bodyMatch[1];
  const firstParagraphIndex = bodyHtml.search(/<p\b/i);
  const metadataHtml = firstParagraphIndex >= 0 ? bodyHtml.slice(0, firstParagraphIndex) : bodyHtml;
  const responseHtml = firstParagraphIndex >= 0 ? bodyHtml.slice(firstParagraphIndex) : "";

  const prompt = extractPrompt(metadataHtml);
  const timestamp = extractTimestamp(metadataHtml);
  const attachments = extractAttachments(metadataHtml);
  const responseText = htmlToText(responseHtml);

  if (!prompt || !responseText) {
    return null;
  }

  return {
    id: "gemini-activity-" + String(index + 1).padStart(4, "0"),
    source: "gemini",
    title: buildTitle(prompt),
    createdAt: timestamp,
    participants: ["user", "assistant"],
    messages: [
      {
        id: "gemini-activity-user-" + (index + 1),
        role: "user",
        text: prompt,
        timestamp,
        attachments: attachments.length > 0 ? attachments : undefined
      },
      {
        id: "gemini-activity-assistant-" + (index + 1),
        role: "assistant",
        text: responseText,
        timestamp
      }
    ]
  };
}

function extractPrompt(metadataHtml: string): string {
  const match = metadataHtml.match(/Prompted(?:&nbsp;|\s)*(.*?)(?:<br\s*\/?>|$)/is);
  return match ? normalizeWhitespace(decodeHtmlEntities(stripTags(match[1]))) : "";
}

function extractTimestamp(metadataHtml: string): string | undefined {
  const lines = metadataHtml
    .split(/<br\s*\/?>/i)
    .map((line) => normalizeWhitespace(decodeHtmlEntities(stripTags(line))))
    .filter(Boolean);

  const candidate = [...lines].reverse().find((line) => !line.startsWith("-") && !/^Attached \d+ file/i.test(line));
  if (!candidate) {
    return undefined;
  }

  const parsed = Date.parse(normalizeTimestampCandidate(candidate));
  return Number.isNaN(parsed) ? undefined : new Date(parsed).toISOString();
}

function extractAttachments(metadataHtml: string): ConversationAttachment[] {
  const attachments: ConversationAttachment[] = [];
  const anchorPattern = /<a\s+href="([^"]+)"[^>]*>(.*?)<\/a>/gis;

  for (const match of metadataHtml.matchAll(anchorPattern)) {
    const href = match[1].trim();
    const label = normalizeWhitespace(decodeHtmlEntities(stripTags(match[2])));
    if (!href || !isLocalAttachmentHref(href)) continue;

    attachments.push({
      id: href,
      label: label || href,
      previewPath: href
    });
  }

  return attachments;
}

function isLocalAttachmentHref(href: string): boolean {
  return !/^[a-z][a-z0-9+.-]*:/i.test(href);
}

function buildTitle(prompt: string): string {
  if (prompt.length <= 80) {
    return prompt || "Gemini Activity";
  }

  return prompt.slice(0, 77).trimEnd() + "...";
}

function htmlToText(html: string): string {
  return normalizeWhitespace(
    decodeHtmlEntities(
      html
        .replace(/<\s*br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n\n")
        .replace(/<\/h[1-6]>/gi, "\n")
        .replace(/<\/li>/gi, "\n")
        .replace(/<li[^>]*>/gi, "- ")
        .replace(/<\/tr>/gi, "\n")
        .replace(/<\/t(?:d|h)>/gi, " | ")
        .replace(/<hr[^>]*>/gi, "\n---\n")
        .replace(/<code[^>]*>/gi, "`")
        .replace(/<\/code>/gi, "`")
        .replace(/<[^>]+>/g, "")
    )
  );
}

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, "");
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
}

function normalizeWhitespace(value: string): string {
  return value
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function normalizeTimestampCandidate(value: string): string {
  return value
    .replace(/\u202f/g, " ")
    .replace(/\s+(NZST|NZDT|UTC)$/i, "");
}
