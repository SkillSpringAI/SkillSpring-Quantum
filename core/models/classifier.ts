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
  /\b(roadmap|plan|milestone|phase|timeline|priorit|sequence|next steps)\b/i
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

function detectDomain(text: string, reasons: string[]): string {
  let best: { label: string; score: number } | null = null;

  for (const domain of DOMAIN_KEYWORDS) {
    let score = 0;
    for (const keyword of domain.keywords) {
      if (text.includes(keyword)) {
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
  const domainEntry = DOMAIN_KEYWORDS.find((entry) => entry.label === domain);
  if (domainEntry?.subjects) {
    for (const subject of domainEntry.subjects) {
      if (text.includes(subject.toLowerCase().replace(/\s+/g, " "))) {
        return subject;
      }
    }
  }

  if (text.includes("docker")) return "Docker";
  if (text.includes("nginx")) return "Nginx";
  if (text.includes("api")) return "API";
  if (text.includes("roadmap")) return "Roadmap";
  if (text.includes("retrieval")) return "Retrieval";
  if (text.includes("dataset")) return "Dataset";
  if (text.includes("privacy")) return "Privacy";
  if (text.includes("governance")) return "Governance";
  if (text.includes("crypto")) return "Crypto Markets";

  return null;
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
