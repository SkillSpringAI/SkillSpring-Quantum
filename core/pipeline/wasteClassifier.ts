import type { ConversationSegment } from "./segmenter.js";

export interface WasteAssessment {
  isWaste: boolean;
  reason: string;
}

const TRIVIAL_PATTERNS = [
  /^\s*(thanks|thank you|ok|okay|cool|yep|yes|no problem|got it|nice)\s*[.!]?\s*$/i,
  /^\s*(hi|hello|hey)\s*[.!]?\s*$/i
];

export function assessWaste(segment: ConversationSegment): WasteAssessment {
  const joined = segment.messages.map(m => m.text.trim()).filter(Boolean).join(" ").trim();
  const userMessages = segment.messages.filter(m => m.role === "user").length;

  if (!joined) {
    return {
      isWaste: true,
      reason: "empty segment"
    };
  }

  if (joined.length < 40 && TRIVIAL_PATTERNS.some(pattern => pattern.test(joined))) {
    return {
      isWaste: true,
      reason: "trivial acknowledgement"
    };
  }

  if (segment.messages.length <= 2 && joined.length < 80 && segment.topic === "general") {
    return {
      isWaste: true,
      reason: "short low-signal general segment"
    };
  }

  if (userMessages === 0 && joined.length < 120) {
    return {
      isWaste: true,
      reason: "assistant-only low-signal fragment"
    };
  }

  return {
    isWaste: false,
    reason: "retain"
  };
}
