import { useEffect, useState } from "react";
import { useNavigation } from "../state/navigationContext";
import { useSettings } from "../state/settingsContext";
import { useAgentContext, type AgentArtifactContext } from "../state/agentContext";
import {
  createAgentSession,
  readAgentHealth,
  sendAgentChat,
  startAgent,
  stopAgent,
  triggerAgentIndex
} from "../services/desktopBridge";
import type { ScreenId } from "../state/navigation";

interface AgentAssistantDrawerProps {
  open: boolean;
  onClose: () => void;
}

interface AgentSource {
  source: string;
  relevance_score?: number;
}

interface AgentConversationEntry {
  role: "user" | "assistant";
  content: string;
  sources?: AgentSource[];
}

interface AgentHealthState {
  running: boolean;
  serverReachable: boolean;
  outputRoot: string;
  port: number;
  prerequisitesOk: boolean | null;
  summary: string;
}

const DEFAULT_HEALTH: AgentHealthState = {
  running: false,
  serverReachable: false,
  outputRoot: "organized_output",
  port: 5678,
  prerequisitesOk: null,
  summary: "Ask Quantum is waiting to connect to the local assistant."
};

export default function AgentAssistantDrawer(props: AgentAssistantDrawerProps) {
  const { activeScreen, activeLabel } = useNavigation();
  const { settings } = useSettings();
  const { currentArtifact } = useAgentContext();
  const [health, setHealth] = useState<AgentHealthState>(DEFAULT_HEALTH);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<AgentConversationEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!props.open) {
      return;
    }

    let cancelled = false;

    async function loadHealth() {
      setBusy(true);
      setError(null);

      const response = await readAgentHealth({
        outputRoot: settings.outputRoot
      });

      if (cancelled) {
        return;
      }

      if (response.ok) {
        setHealth(normalizeHealthState(response.result, settings.outputRoot));
      } else {
        setError(response.error);
      }

      setBusy(false);
    }

    void loadHealth();

    return () => {
      cancelled = true;
    };
  }, [props.open, settings.outputRoot]);

  if (!props.open) {
    return null;
  }

  const starterPrompts = getStarterPrompts(activeScreen);

  async function handleStartAgent() {
    setBusy(true);
    setError(null);

    const response = await startAgent({
      outputRoot: settings.outputRoot
    });

    if (response.ok) {
      const result = response.result as { health?: unknown; running?: boolean; port?: number; outputRoot?: string };
      setHealth(normalizeHealthState(result.health ?? result, settings.outputRoot));
    } else {
      setError(response.error);
    }

    setBusy(false);
  }

  async function handleStopAgent() {
    setBusy(true);
    setError(null);

    const response = await stopAgent({});

    if (response.ok) {
      setHealth({
        ...DEFAULT_HEALTH,
        outputRoot: settings.outputRoot,
        summary: "Ask Quantum has been stopped for this app session."
      });
      setSessionId(null);
    } else {
      setError(response.error);
    }

    setBusy(false);
  }

  async function handleIndex() {
    setBusy(true);
    setError(null);

    const response = await triggerAgentIndex({
      outputRoot: settings.outputRoot
    });

    if (!response.ok) {
      setError(response.error);
    }

    setBusy(false);
  }

  async function ensureSession(): Promise<string | null> {
    if (sessionId) {
      return sessionId;
    }

    const response = await createAgentSession({
      outputRoot: settings.outputRoot,
      title: `Ask Quantum - ${activeLabel}`
    });

    if (!response.ok) {
      setError(response.error);
      return null;
    }

    const nextSessionId = extractSessionId(response.result);
    if (!nextSessionId) {
      setError("Local agent session did not return an id.");
      return null;
    }

    setSessionId(nextSessionId);
    return nextSessionId;
  }

  async function handleSend(rawPrompt: string) {
    const prompt = rawPrompt.trim();
    if (!prompt) {
      return;
    }

    setBusy(true);
    setError(null);

    const startResponse = await startAgent({
      outputRoot: settings.outputRoot
    });

    if (!startResponse.ok) {
      setError(startResponse.error);
      setBusy(false);
      return;
    }

    setHealth(normalizeHealthState((startResponse.result as { health?: unknown }).health ?? startResponse.result, settings.outputRoot));

    const activeSessionId = await ensureSession();
    if (!activeSessionId) {
      setBusy(false);
      return;
    }

    const contextualMessage = buildContextualPrompt(prompt, {
      activeLabel,
      activeScreen,
      outputRoot: settings.outputRoot,
      artifact: currentArtifact
    });

    setMessages((current) => [...current, { role: "user", content: prompt }]);
    setDraft("");

    const response = await sendAgentChat({
      outputRoot: settings.outputRoot,
      sessionId: activeSessionId,
      message: contextualMessage,
      systemPrompt: systemPromptForScreen(activeScreen)
    });

    if (response.ok) {
      const result = response.result as { response?: string; sources?: AgentSource[] };
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: result.response ?? "Ask Quantum did not return a response.",
          sources: result.sources ?? []
        }
      ]);
    } else {
      setError(response.error);
    }

    setBusy(false);
  }

  return (
    <div className="agent-drawer-backdrop" onClick={props.onClose}>
      <aside
        className="agent-drawer"
        aria-label="Ask Quantum"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="agent-drawer-header">
          <div>
            <h2>Ask Quantum</h2>
            <p className="muted">
              Ask for a plain-language explanation of this screen, the current output folder, or what to do next.
            </p>
          </div>
          <button className="secondary-btn" type="button" onClick={props.onClose}>
            Close
          </button>
        </div>

        <div className="agent-status-row">
          <span className={`status-pill ${health.running ? "success" : "idle"}`}>
            {health.running ? "Assistant running" : "Assistant stopped"}
          </span>
          <span className="signal-badge">screen: {activeLabel}</span>
          <span className="signal-badge">output: {describeOutputRoot(settings.outputRoot)}</span>
        </div>

        {currentArtifact ? (
          <div className="detail-box">
            <strong>Current focus</strong>
            <p className="muted">{currentArtifact.title}</p>
            {currentArtifact.summary ? <p className="muted">{currentArtifact.summary}</p> : null}
            <div className="signal-badge-row">
              <span className="signal-badge">{formatArtifactKind(currentArtifact.kind)}</span>
              {currentArtifact.path ? <span className="signal-badge">{currentArtifact.path}</span> : null}
            </div>
            {currentArtifact.details && currentArtifact.details.length > 0 ? (
              <ul className="list">
                {currentArtifact.details.slice(0, 4).map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <div className="detail-box">
          <strong>Assistant status</strong>
          <p className="muted">{health.summary}</p>
          {error ? <p className="save-error">{error}</p> : null}
          <div className="action-bar">
            <button className="primary-btn" type="button" onClick={handleStartAgent} disabled={busy}>
              Start Local Assistant
            </button>
            <button className="secondary-btn" type="button" onClick={handleIndex} disabled={busy}>
              Index Current Output
            </button>
            <button className="secondary-btn" type="button" onClick={handleStopAgent} disabled={busy}>
              Stop Assistant
            </button>
          </div>
        </div>

        <div className="detail-box">
          <strong>Try one of these</strong>
          <div className="agent-starter-grid">
            {starterPrompts.map((prompt) => (
              <button
                key={prompt}
                className="secondary-btn agent-starter-btn"
                type="button"
                onClick={() => void handleSend(prompt)}
                disabled={busy}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        <div className="detail-box">
          <strong>Custom question</strong>
          <label className="form-label tight">
            <span className="label">What do you want explained?</span>
            <textarea
              className="text-area"
              rows={4}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={`Ask about ${activeLabel.toLowerCase()}, the current output folder, or the next action.`}
            />
          </label>
          <div className="action-bar">
            <button className="primary-btn" type="button" onClick={() => void handleSend(draft)} disabled={busy || !draft.trim()}>
              Send To Quantum
            </button>
          </div>
        </div>

        <div className="agent-message-stack">
          {messages.length === 0 ? (
            <div className="detail-box">
              <strong>No questions yet</strong>
              <p className="muted">
                Start with one of the screen-specific prompts above and Quantum will explain this part of the workflow in plain language.
              </p>
            </div>
          ) : null}

          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`detail-box agent-message ${message.role === "assistant" ? "assistant" : "user"}`}
            >
              <strong>{message.role === "assistant" ? "Quantum" : "You"}</strong>
              <p>{message.content}</p>
              {message.sources && message.sources.length > 0 ? (
                <div className="agent-source-list">
                  {message.sources.map((source, sourceIndex) => (
                    <div key={`${source.source}-${sourceIndex}`} className="signal-badge">
                      {source.relevance_score ? `${Math.round(source.relevance_score * 100)}% ` : ""}
                      {source.source}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

function getStarterPrompts(screen: ScreenId): string[] {
  switch (screen) {
    case "imports":
      return [
        "Explain this export check",
        "Why did this import use a fallback path?",
        "What should I do next?"
      ];
    case "organized-output":
      return [
        "Summarize this conversation view",
        "What topic is this really about?",
        "Should I stay in archive or open dataset view?"
      ];
    case "datasets":
      return [
        "Explain this preview",
        "What does this redaction summary mean?",
        "What stands out in this run?"
      ];
    case "retrieval":
      return [
        "Help me find the conversation about...",
        "Why did this result match?",
        "What filters should I change?"
      ];
    default:
      return [
        "Explain what this screen is for",
        "What is the recommended path through Quantum?",
        "What should I review first?"
      ];
  }
}

function systemPromptForScreen(screen: ScreenId): "default" | "archive_qa" | "dataset_query" | "topic_summary" | "import_assist" {
  switch (screen) {
    case "imports":
      return "import_assist";
    case "organized-output":
      return "archive_qa";
    case "datasets":
      return "dataset_query";
    case "retrieval":
      return "archive_qa";
    default:
      return "default";
  }
}

function buildContextualPrompt(
  userPrompt: string,
  context: {
    activeScreen: ScreenId;
    activeLabel: string;
    outputRoot: string;
    artifact: AgentArtifactContext | null;
  }
): string {
  const parts = [
    `Current SkillSpring Quantum screen: ${context.activeLabel} (${context.activeScreen}).`,
    `Current output folder: ${context.outputRoot}.`,
    "Answer as a concise in-app assistant helping the user understand the current screen, the relevant artifacts, and the next useful action."
  ];

  if (context.artifact) {
    parts.push(`Current focused artifact: ${context.artifact.title}.`);
    parts.push(`Artifact kind: ${context.artifact.kind}.`);
    if (context.artifact.path) {
      parts.push(`Artifact path: ${context.artifact.path}.`);
    }
    if (context.artifact.summary) {
      parts.push(`Artifact summary: ${context.artifact.summary}.`);
    }
    if (context.artifact.details && context.artifact.details.length > 0) {
      parts.push(`Artifact details: ${context.artifact.details.join(" | ")}.`);
    }
  }

  parts.push("When relevant, explain this exact artifact before describing the broader screen.");
  parts.push(`User request: ${userPrompt}`);
  return parts.join(" ");
}

function extractSessionId(result: unknown): string | null {
  if (!result || typeof result !== "object") {
    return null;
  }

  const sessionWrapper = result as { session?: { id?: string } };
  if (sessionWrapper.session?.id) {
    return sessionWrapper.session.id;
  }

  return null;
}

function normalizeHealthState(result: unknown, outputRoot: string): AgentHealthState {
  if (!result || typeof result !== "object") {
    return {
      ...DEFAULT_HEALTH,
      outputRoot
    };
  }

  const candidate = result as Partial<AgentHealthState> & { details?: Record<string, unknown> };
  return {
    running: Boolean(candidate.running ?? candidate.serverReachable),
    serverReachable: Boolean(candidate.serverReachable ?? candidate.running),
    outputRoot: candidate.outputRoot ?? outputRoot,
    port: typeof candidate.port === "number" ? candidate.port : 5678,
    prerequisitesOk:
      typeof candidate.prerequisitesOk === "boolean"
        ? candidate.prerequisitesOk
        : candidate.running
          ? true
          : null,
    summary: typeof candidate.summary === "string" && candidate.summary.trim()
      ? candidate.summary
      : candidate.running
        ? "Local assistant is running."
        : "Ask Quantum is waiting for the local assistant."
  };
}

function describeOutputRoot(outputRoot: string): string {
  const normalized = outputRoot.replace(/[\\/]+$/, "");
  const segments = normalized.split(/[\\/]/).filter(Boolean);
  const label = segments[segments.length - 1] ?? outputRoot;
  return label === outputRoot ? outputRoot : `${label} (${outputRoot})`;
}

function formatArtifactKind(kind: AgentArtifactContext["kind"]): string {
  switch (kind) {
    case "import_run":
      return "import run";
    case "archive_file":
      return "archive file";
    case "dataset_preview":
      return "dataset preview";
    case "retrieval_result":
      return "retrieval result";
    default:
      return "screen context";
  }
}
