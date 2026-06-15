import type { ConversationMessage } from "../parser/types.js";

export interface RedactionResult {
  text: string;
  redactionCount: number;
  flags: string[];
}

const EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_REGEX = /\b(?:\+?\d[\d\s\-()]{7,}\d)\b/g;
const URL_REGEX = /\bhttps?:\/\/[^\s]+/gi;
const POSSIBLE_ADDRESS_REGEX = /\b\d{1,5}\s+[A-Za-z0-9.\-'\s]{3,40}\s(?:Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Lane|Ln|Close|Court|Ct|Way)\b/gi;

export function redactText(input: string): RedactionResult {
  let text = input;
  let redactionCount = 0;
  const flags = new Set<string>();

  const apply = (regex: RegExp, replacement: string, flag: string): void => {
    text = text.replace(regex, (match) => {
      redactionCount += 1;
      flags.add(flag);
      return replacement;
    });
  };

  apply(EMAIL_REGEX, "[REDACTED_EMAIL]", "email");
  apply(PHONE_REGEX, "[REDACTED_PHONE]", "phone");
  apply(URL_REGEX, "[REDACTED_URL]", "url");
  apply(POSSIBLE_ADDRESS_REGEX, "[REDACTED_ADDRESS]", "address");

  return {
    text,
    redactionCount,
    flags: [...flags]
  };
}

export function redactMessages(messages: ConversationMessage[]): {
  messages: ConversationMessage[];
  redactionCount: number;
  flags: string[];
} {
  let total = 0;
  const flags = new Set<string>();

  const output = messages.map((message) => {
    const result = redactText(message.text);
    total += result.redactionCount;
    result.flags.forEach((flag) => flags.add(flag));

    return {
      ...message,
      text: result.text
    };
  });

  return {
    messages: output,
    redactionCount: total,
    flags: [...flags]
  };
}
