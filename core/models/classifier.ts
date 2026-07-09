import type { Conversation, ConversationMessage } from "../parser/types.js";

export type SegmentIntentLabel =
  | "troubleshooting"
  | "planning"
  | "decision"
  | "review"
  | "research"
  | "implementation"
  | "request"
  | "explanation"
  | "general";

export type SegmentImportance = "high" | "medium" | "low";

export interface ClassificationResult {
  intent: SegmentIntentLabel;
  importance: SegmentImportance;
  domain: string;
  summaryLabel: string;
  confidence: number;
  reasons: string[];
}

interface KeywordDomain {
  label: string;
  keywords: string[];
  subjects?: string[];
}

const SUBJECT_STOP_WORDS = new Set([
  "a","an","and","are","as","at","be","but","by","can","could","did","do","does","for","from","get","help","how","i","if","in","into",
  "is","it","me","my","need","of","on","or","our","please","should","so","that","the","this","to","us","want","we",
  "what","when","where","which","why","with","would","you","your",
  "again","already","best","change","clean","compare","day","each","first","going","helping","losing","old","pack","same","split","up","way","went"
]);

const GENERIC_SUBJECT_TOKENS = new Set([
  "assistant","chat","conversation","decision","discussion","general","import","issue","message","messages",
  "plan","planning","problem","question","request","review","summary","task","thing","things","topic","topics",
  "troubleshooting","update","updates"
]);

const DOMAIN_KEYWORDS: KeywordDomain[] = [
  {
    label: "Product",
    keywords: ["roadmap", "mvp", "feature", "priorit", "ux", "user flow", "product", "launch"],
    subjects: ["Roadmap", "Feature", "UX", "Product"]
  },
  {
    label: "Engineering",
    keywords: ["api", "endpoint", "backend", "frontend", "typescript", "react", "build", "deploy", "refactor", "repo"],
    subjects: ["API", "Backend", "Frontend", "TypeScript", "React", "Repository"]
  },
  {
    label: "DevOps",
    keywords: ["docker", "container", "kubernetes", "k8s", "nginx", "port", "proxy", "pipeline", "ci", "deploy"],
    subjects: ["Docker", "Container", "Kubernetes", "Nginx", "CI Pipeline"]
  },
  {
    label: "Governance",
    keywords: ["governance", "policy", "rule", "compliance", "audit", "review queue", "retention", "dataset policy"],
    subjects: ["Governance", "Policy", "Compliance", "Audit"]
  },
  {
    label: "Privacy",
    keywords: ["privacy", "redaction", "pii", "sensitive", "security", "credential", "api key", "secret"],
    subjects: ["Privacy", "Redaction", "Security", "API Key"]
  },
  {
    label: "Finance",
    keywords: ["crypto", "bitcoin", "market", "portfolio", "trading", "revenue", "pricing", "budget"],
    subjects: ["Crypto Markets", "Portfolio", "Pricing", "Budget"]
  },
  {
    label: "Support",
    keywords: ["customer", "support", "ticket", "complaint", "incident", "escalation", "sla"],
    subjects: ["Support", "Customer Issue", "Incident"]
  },
  {
    label: "Data",
    keywords: ["dataset", "jsonl", "schema", "index", "retrieval", "segment", "metadata", "import history"],
    subjects: ["Dataset", "Retrieval", "Schema", "Metadata"]
  },
  {
    label: "Writing",
    keywords: ["write", "draft", "copy", "document", "proposal", "email", "summary", "rewrite"],
    subjects: ["Document", "Proposal", "Summary", "Email"]
  }
];

const HIGH_IMPORTANCE_PATTERNS = [
  /\b(asap|urgent|immediately|right away|critical|severe|blocker|blocked|outage)\b/i,
  /\b(security|privacy|compliance|legal|breach|incident)\b/i,
  /\b(production|prod)\b/i
];

const DEBUG_PATTERNS = [
  /\b(error|errors|bug|broken|failed|failing|failure|exception|500|404|timeout|stack trace|not working|doesn t work|cannot connect|can t connect)\b/i,
  /\b(debug|fix|investigate|trace|root cause)\b/i
];

const PLANNING_PATTERNS = [
  /\b(roadmap|plan|milestone|phase|timeline|priorit|sequence|next steps|organize|schedule|coordinate|arrange)\b/i,
  /\b(split|assign|cover|staff)\b[\s\S]{0,40}\b(shift|shifts|schedule|calendar|roster|rota)\b/i
];

const DECISION_PATTERNS = [
  /\b(should we|should i|choose|option|tradeoff|trade-off|pros and cons|recommend|versus|vs\.?)\b/i
];

const REVIEW_PATTERNS = [
  /\b(review|feedback|critique|improve|clean up|cleanup|refactor|polish|audit)\b/i
];

const IMPLEMENTATION_PATTERNS = [
  /\b(implement|build|add|create|wire|integrate|ship|code|patch)\b/i
];

const RESEARCH_PATTERNS = [
  /\b(research|compare|investigate|learn|explain|how does|what is|why does)\b/i
];

const REQUEST_PATTERNS = [
  /\b(help me|can you|please|need to|i need|want to)\b/i
];

export function classifyConversation(conversation: Conversation): ClassificationResult | null {
  return classifyMessages(conversation.title, conversation.messages);
}

export function classifyMessages(
  title: string | undefined,
  messages: ConversationMessage[]
): ClassificationResult | null {
  if (messages.length === 0) {
    return null;
  }

  const prioritizedText = buildPrioritizedText(messages);
  const normalized = normalizeText(prioritizedText);
  const reasons: string[] = [];

  const domain = detectDomain(normalized, reasons);
  const intent = detectIntent(normalized, reasons);
  const importance = detectImportance(normalized, intent, domain, reasons);
  const summaryLabel = buildSummaryLabel(title, normalized, domain, intent);
  const confidence = computeConfidence(domain, intent, reasons);

  return {
    intent,
    importance,
    domain,
    summaryLabel,
    confidence,
    reasons: uniqueValues(reasons)
  };
}

function buildPrioritizedText(messages: ConversationMessage[]): string {
  const preferred = messages
    .filter((message) => message.role === "user" || message.role === "system")
    .map((message) => message.text.trim())
    .filter(Boolean);
  const fallback = messages
    .map((message) => message.text.trim())
    .filter(Boolean);

  return (preferred.length > 0 ? preferred : fallback).join("\n\n");
}

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s/.-]/g, " ");
}

function tokenizeForMatching(text: string): string[] {
  return normalizeText(text)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function containsKeyword(text: string, tokens: string[], keyword: string): boolean {
  const normalizedKeyword = keyword.toLowerCase().trim();
  if (!normalizedKeyword) {
    return false;
  }

  if (!normalizedKeyword.includes(" ")) {
    return tokens.includes(normalizedKeyword);
  }

  const keywordTokens = normalizedKeyword.split(/\s+/).filter(Boolean);
  for (let index = 0; index <= tokens.length - keywordTokens.length; index += 1) {
    let matched = true;
    for (let offset = 0; offset < keywordTokens.length; offset += 1) {
      if (tokens[index + offset] !== keywordTokens[offset]) {
        matched = false;
        break;
      }
    }

    if (matched) {
      return true;
    }
  }

  return text.includes(normalizedKeyword);
}

function detectDomain(text: string, reasons: string[]): string {
  const tokens = tokenizeForMatching(text);
  let best: { label: string; score: number } | null = null;

  for (const domain of DOMAIN_KEYWORDS) {
    let score = 0;
    for (const keyword of domain.keywords) {
      if (containsKeyword(text, tokens, keyword)) {
        score += 1;
      }
    }

    if (score > 0) {
      reasons.push("domain:" + domain.label.toLowerCase());
    }

    if (!best || score > best.score) {
      best = { label: domain.label, score };
    }
  }

  return best && best.score > 0 ? best.label : "General";
}

function detectIntent(text: string, reasons: string[]): SegmentIntentLabel {
  if (matchesAny(text, DEBUG_PATTERNS)) {
    reasons.push("intent:troubleshooting");
    return "troubleshooting";
  }

  if (matchesAny(text, PLANNING_PATTERNS)) {
    reasons.push("intent:planning");
    return "planning";
  }

  if (matchesAny(text, DECISION_PATTERNS)) {
    reasons.push("intent:decision");
    return "decision";
  }

  if (matchesAny(text, REVIEW_PATTERNS)) {
    reasons.push("intent:review");
    return "review";
  }

  if (matchesAny(text, IMPLEMENTATION_PATTERNS)) {
    reasons.push("intent:implementation");
    return "implementation";
  }

  if (matchesAny(text, RESEARCH_PATTERNS)) {
    reasons.push("intent:research");
    return "research";
  }

  if (matchesAny(text, REQUEST_PATTERNS)) {
    reasons.push("intent:request");
    return "request";
  }

  if (text.includes("?")) {
    reasons.push("intent:explanation");
    return "explanation";
  }

  return "general";
}

function detectImportance(
  text: string,
  intent: SegmentIntentLabel,
  domain: string,
  reasons: string[]
): SegmentImportance {
  if (matchesAny(text, HIGH_IMPORTANCE_PATTERNS)) {
    reasons.push("importance:high_signal_words");
    return "high";
  }

  if (intent === "troubleshooting" || intent === "decision" || intent === "implementation") {
    reasons.push("importance:actionable");
    return "medium";
  }

  if (domain === "Privacy" || domain === "Governance") {
    reasons.push("importance:sensitive_domain");
    return "medium";
  }

  if (intent === "general") {
    return "low";
  }

  return "medium";
}

function buildSummaryLabel(
  title: string | undefined,
  text: string,
  domain: string,
  intent: SegmentIntentLabel
): string {
  const preferredSubject = detectPreferredSubject(text, domain);
  const titleSubject = normalizeTitleSubject(title);
  const subject = preferredSubject ?? titleSubject ?? domain;

  const suffix = intentToSuffix(intent);
  if (!subject || subject === "General") {
    return suffix;
  }

  if (subject.endsWith(suffix)) {
    return subject;
  }

  return subject + " " + suffix;
}

function detectPreferredSubject(text: string, domain: string): string | null {
  const tokens = tokenizeForMatching(text);
  if (containsKeyword(text, tokens, "docker")) return "Docker";
  if (containsKeyword(text, tokens, "nginx")) return "Nginx";
  if (containsKeyword(text, tokens, "api")) return "API";
  if (containsKeyword(text, tokens, "roadmap")) return "Roadmap";
  if (containsKeyword(text, tokens, "retrieval")) return "Retrieval";
  if (containsKeyword(text, tokens, "dataset")) return "Dataset";
  if (containsKeyword(text, tokens, "privacy")) return "Privacy";
  if (containsKeyword(text, tokens, "governance")) return "Governance";
  if (containsKeyword(text, tokens, "crypto")) return "Crypto Markets";

  const extractedPhrase = extractTopicPhrase(text);
  if (extractedPhrase) {
    return extractedPhrase;
  }

  const domainEntry = DOMAIN_KEYWORDS.find((entry) => entry.label === domain);
  if (domainEntry?.subjects) {
    for (const subject of domainEntry.subjects) {
      if (containsKeyword(text, tokens, subject.toLowerCase().replace(/\s+/g, " "))) {
        return subject;
      }
    }
  }

  return null;
}

function extractTopicPhrase(text: string): string | null {
  const tokens = text
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, ""))
    .filter((token) => token.length >= 3);

  if (tokens.length === 0) {
    return null;
  }

  const candidates = new Map<string, number>();

  for (let size = 4; size >= 2; size -= 1) {
    for (let index = 0; index <= tokens.length - size; index += 1) {
      const phraseTokens = trimTopicPhraseEdges(tokens.slice(index, index + size));
      if (!isUsefulTopicPhrase(phraseTokens)) {
        continue;
      }

      const phrase = phraseTokens.join(" ");
      const score = scoreTopicPhrase(phraseTokens, index);
      candidates.set(phrase, Math.max(candidates.get(phrase) ?? 0, score));
    }
  }

  if (candidates.size === 0) {
    return null;
  }

  const [bestPhrase] = [...candidates.entries()].sort((a, b) => b[1] - a[1])[0];
  return bestPhrase
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function trimTopicPhraseEdges(tokens: string[]): string[] {
  let start = 0;
  let end = tokens.length;

  while (start < end && SUBJECT_STOP_WORDS.has(tokens[start])) {
    start += 1;
  }

  while (end > start && SUBJECT_STOP_WORDS.has(tokens[end - 1])) {
    end -= 1;
  }

  return tokens.slice(start, end);
}

function scoreTopicPhrase(tokens: string[], index: number): number {
  const strongTokenCount = tokens.filter((token) => token.length >= 5 && !GENERIC_SUBJECT_TOKENS.has(token)).length;
  const stopWordPenalty = tokens.filter((token) => SUBJECT_STOP_WORDS.has(token)).length * 6;
  return tokens.length * 10 + strongTokenCount * 4 - stopWordPenalty - index;
}

function isUsefulTopicPhrase(tokens: string[]): boolean {
  if (tokens.length < 2) {
    return false;
  }

  if (tokens.some((token) => SUBJECT_STOP_WORDS.has(token))) {
    return false;
  }

  if (tokens.every((token) => GENERIC_SUBJECT_TOKENS.has(token))) {
    return false;
  }

  const strongTokenCount = tokens.filter((token) => token.length >= 5 && !GENERIC_SUBJECT_TOKENS.has(token)).length;
  return strongTokenCount >= 1;
}

function normalizeTitleSubject(title: string | undefined): string | null {
  const trimmed = title?.trim();
  if (!trimmed) return null;

  if (/^(new chat|untitled|conversation|chat)$/i.test(trimmed)) {
    return null;
  }

  return trimmed.length > 64 ? trimmed.slice(0, 64).trim() : trimmed;
}

function intentToSuffix(intent: SegmentIntentLabel): string {
  switch (intent) {
    case "troubleshooting":
      return "Troubleshooting";
    case "planning":
      return "Planning";
    case "decision":
      return "Decision";
    case "review":
      return "Review";
    case "research":
      return "Research";
    case "implementation":
      return "Implementation";
    case "request":
      return "Request";
    case "explanation":
      return "How-To";
    default:
      return "Discussion";
  }
}

function computeConfidence(domain: string, intent: SegmentIntentLabel, reasons: string[]): number {
  let confidence = 0.35;
  if (domain !== "General") confidence += 0.2;
  if (intent !== "general") confidence += 0.2;
  confidence += Math.min(0.2, uniqueValues(reasons).length * 0.04);
  return Math.min(0.92, confidence);
}

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function uniqueValues<T>(values: T[]): T[] {
  return [...new Set(values)];
}
