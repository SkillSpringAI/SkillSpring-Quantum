import type { Conversation } from "../parser/types.js";
import type { ConversationSegment } from "../pipeline/segmenter.js";
import { formatRelativeTimestamp } from "./time.js";

function escapeFence(text: string): string {
  return text.replace(/`/g, "'''");
}

export function renderConversationMarkdown(
  conversation: Conversation,
  topic: string,
  confidence: number,
  reason: string
): string {
  const header = [
    "---",
    "id: " + conversation.id,
    "source: " + conversation.source,
    "title: " + JSON.stringify(conversation.title ?? "Untitled"),
    "createdAt: " + JSON.stringify(conversation.createdAt ?? ""),
    "topic: " + JSON.stringify(topic),
    "confidence: " + confidence,
    "reason: " + JSON.stringify(reason),
    "participants:",
    ...conversation.participants.map(p => "  - " + p),
    "---",
    ""
  ].join("\n");

  const title = "# " + (conversation.title ?? "Untitled Conversation") + "\n";

  const transcript = conversation.messages
    .map((msg, index) => {
      const relative = formatRelativeTimestamp(conversation.createdAt, msg.timestamp);
      const timestamp = msg.timestamp ? " (" + relative + " / " + msg.timestamp + ")" : " (" + relative + ")";
      return [
        "## " + (index + 1) + ". " + msg.role + timestamp,
        "",
        escapeFence(msg.text || ""),
        ""
      ].join("\n");
    })
    .join("\n");

  return header + title + "\n" + transcript.trim() + "\n";
}

export function renderSegmentMarkdown(segment: ConversationSegment): string {
  const header = [
    "---",
    "conversationId: " + segment.conversationId,
    "source: " + segment.source,
    "title: " + JSON.stringify(segment.title ?? "Untitled"),
    "createdAt: " + JSON.stringify(segment.createdAt ?? ""),
    "topic: " + JSON.stringify(segment.topic),
    "rawTopic: " + JSON.stringify(segment.rawTopic),
    "confidence: " + segment.confidence,
    "reason: " + JSON.stringify(segment.reason),
    "matchedKeywords: " + JSON.stringify(segment.matchedKeywords),
    "startIndex: " + segment.startIndex,
    "endIndex: " + segment.endIndex,
    "participants:",
    ...segment.participants.map(p => "  - " + p),
    "---",
    ""
  ].join("\n");

  const title = "# " + (segment.title ?? "Untitled Conversation") + "\n";
  const subtitle = "## Segment Topic: " + segment.topic + "\n";

  const transcript = segment.messages
    .map((msg, index) => {
      const relative = formatRelativeTimestamp(segment.createdAt, msg.timestamp);
      const timestamp = msg.timestamp ? " (" + relative + " / " + msg.timestamp + ")" : " (" + relative + ")";
      return [
        "### " + (index + 1) + ". " + msg.role + timestamp,
        "",
        escapeFence(msg.text || ""),
        ""
      ].join("\n");
    })
    .join("\n");

  return header + title + "\n" + subtitle + "\n" + transcript.trim() + "\n";
}
