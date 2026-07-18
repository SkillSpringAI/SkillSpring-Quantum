import type { ConversationMessage } from "../parser/types.js";
import { loadRedactionRules } from "../governance/loadRules.js";

export interface RedactionResult {
  text: string;
  redactionCount: number;
  flags: string[];
  flagCounts: Record<string, number>;
}

const EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_REGEX = /\b(?:\+?\d[\d\s\-()]{7,}\d)\b/g;
const URL_REGEX = /\bhttps?:\/\/[^\s]+/gi;
const POSSIBLE_ADDRESS_REGEX = /\b\d{1,5}\s+[A-Za-z0-9.\-'\s]{3,40}\s(?:Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Lane|Ln|Close|Court|Ct|Way)\b/gi;
const REDACTION_RULES = loadRedactionRules();

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildLiteralRegex(pattern: string): RegExp | null {
  const trimmed = pattern.trim();
  if (!trimmed) {
    return null;
  }

  return new RegExp(escapeRegExp(trimmed), "gi");
}

export function redactText(input: string): RedactionResult {
  let text = input;
  let redactionCount = 0;
  const flags = new Set<string>();
  const flagCounts = new Map<string, number>();

  const apply = (regex: RegExp, replacement: string, flag: string): void => {
    text = text.replace(regex, (match) => {
      redactionCount += 1;
      flags.add(flag);
      flagCounts.set(flag, (flagCounts.get(flag) ?? 0) + 1);
      return replacement;
    });
  };

  const targets = new Set(REDACTION_RULES.redaction_targets.map((target) => target.toLowerCase()));

  if (targets.has("email")) {
    apply(EMAIL_REGEX, "[REDACTED_EMAIL]", "email");
  }

  if (targets.has("phone")) {
    apply(PHONE_REGEX, "[REDACTED_PHONE]", "phone");
  }

  if (targets.has("url")) {
    apply(URL_REGEX, "[REDACTED_URL]", "url");
  }

  if (targets.has("address")) {
    apply(POSSIBLE_ADDRESS_REGEX, "[REDACTED_ADDRESS]", "address");
  }

  for (const pattern of REDACTION_RULES.hard_private_patterns) {
    const regex = buildLiteralRegex(pattern);
    if (!regex) {
      continue;
    }

    apply(regex, "[REDACTED_PRIVATE_PATTERN]", "hard_private_pattern");
  }

  return {
    text,
    redactionCount,
    flags: [...flags],
    flagCounts: Object.fromEntries(flagCounts)
  };
}

export function redactMessages(messages: ConversationMessage[]): {
  messages: ConversationMessage[];
  redactionCount: number;
  flags: string[];
  flagCounts: Record<string, number>;
} {
  let total = 0;
  const flags = new Set<string>();
  const flagCounts = new Map<string, number>();

  const output = messages.map((message) => {
    const result = redactText(message.text);
    total += result.redactionCount;
    result.flags.forEach((flag) => flags.add(flag));
    for (const [flag, count] of Object.entries(result.flagCounts)) {
      flagCounts.set(flag, (flagCounts.get(flag) ?? 0) + count);
    }

    return {
      ...message,
      text: result.text
    };
  });

  return {
    messages: output,
    redactionCount: total,
    flags: [...flags],
    flagCounts: Object.fromEntries(flagCounts)
  };
}
