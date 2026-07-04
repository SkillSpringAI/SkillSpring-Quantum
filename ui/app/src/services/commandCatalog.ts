import type { AgentArtifactContext } from "../state/agentContext";
import type { RetrievalInvestigationIntent } from "../state/navigationContext";
import type { ScreenId } from "../state/navigation";
import { inspectImportPath, runImportPath, triggerAgentIndex } from "./desktopBridge";
import { revealDesktopPath } from "./pathBridge";

export type SupportedCommandName =
  | "inspect_export"
  | "import_export"
  | "open_output_location"
  | "search_completed_outputs"
  | "rebuild_search_index"
  | "open_archive"
  | "open_datasets"
  | "open_imports";

export interface SupportedCommandDefinition {
  name: SupportedCommandName;
  label: string;
  examples: string[];
}

export interface CommandExecutionContext {
  outputRoot: string;
  activeScreen: ScreenId;
  activeLabel: string;
  artifact: AgentArtifactContext | null;
  setActiveScreen: (screen: ScreenId) => void;
  openRetrievalInvestigation: (intent: RetrievalInvestigationIntent) => void;
}

export interface CommandExecutionResult {
  handled: boolean;
  command?: SupportedCommandName;
  response: string;
}

interface ParsedCommand {
  command: SupportedCommandName;
  path?: string;
  searchText?: string;
  vendor?: string;
  topic?: string;
}

const SUPPORTED_COMMANDS: SupportedCommandDefinition[] = [
  {
    name: "inspect_export",
    label: "Inspect export",
    examples: [
      "check this export C:\\Exports\\claude",
      "inspect export C:\\Exports\\chat.json"
    ]
  },
  {
    name: "import_export",
    label: "Import export",
    examples: [
      "run import C:\\Exports\\claude",
      "import this file C:\\Exports\\chat.json"
    ]
  },
  {
    name: "open_output_location",
    label: "Open output location",
    examples: [
      "open the output folder",
      "show me the current output files"
    ]
  },
  {
    name: "search_completed_outputs",
    label: "Search completed outputs",
    examples: [
      "find the conversation about docker ports",
      "search outputs for travel reimbursement"
    ]
  },
  {
    name: "rebuild_search_index",
    label: "Rebuild search index",
    examples: [
      "rebuild the search index",
      "reindex this output folder"
    ]
  },
  {
    name: "open_archive",
    label: "Open Readable Archive",
    examples: ["open archive", "take me to readable archive"]
  },
  {
    name: "open_datasets",
    label: "Open Datasets",
    examples: ["open datasets", "take me to dataset view"]
  },
  {
    name: "open_imports",
    label: "Open Imports",
    examples: ["open imports", "go to imports"]
  }
];

const VENDOR_HINTS = ["chatgpt", "claude", "grok", "gemini", "copilot"];

export function listSupportedCommands(): SupportedCommandDefinition[] {
  return SUPPORTED_COMMANDS;
}

export async function tryExecuteSupportedCommand(
  prompt: string,
  context: CommandExecutionContext
): Promise<CommandExecutionResult | null> {
  const parsed = parseSupportedCommand(prompt);
  if (!parsed) {
    return null;
  }

  switch (parsed.command) {
    case "inspect_export": {
      if (!parsed.path) {
        return {
          handled: true,
          command: parsed.command,
          response: "I can inspect an export, but I need the source path in the request. Example: `check this export C:\\Exports\\claude`."
        };
      }

      const response = await inspectImportPath({ inputPath: parsed.path });
      if (!response.ok) {
        return {
          handled: true,
          command: parsed.command,
          response: `Quantum could not inspect that export path: ${response.error}`
        };
      }

      const result = response.result as {
        inputType?: string;
        totalFiles?: number;
        supportedFiles?: number;
        unsupportedFiles?: number;
        notes?: string[];
      };

      return {
        handled: true,
        command: parsed.command,
        response:
          `Export check complete for ${parsed.path}. ` +
          `Type: ${result.inputType ?? "unknown"}. ` +
          `Files found: ${result.totalFiles ?? 0}. ` +
          `Supported: ${result.supportedFiles ?? 0}. ` +
          `Unsupported: ${result.unsupportedFiles ?? 0}. ` +
          `${result.notes?.[0] ?? "If this looks right, the next step is to run the import from Imports."}`
      };
    }

    case "import_export": {
      if (!parsed.path) {
        return {
          handled: true,
          command: parsed.command,
          response: "I can run an import, but I need the export path in the request. Example: `run import C:\\Exports\\claude`."
        };
      }

      const response = await runImportPath({
        inputPath: parsed.path,
        outputRoot: context.outputRoot
      });

      if (!response.ok) {
        return {
          handled: true,
          command: parsed.command,
          response: `Quantum could not start that import: ${response.error}`
        };
      }

      context.setActiveScreen("imports");
      return {
        handled: true,
        command: parsed.command,
        response:
          `Import started for ${parsed.path}. I moved you to Imports so you can watch the deterministic progress and follow the next-step cards when it finishes.`
      };
    }

    case "open_output_location": {
      const targetPath = context.artifact?.path || context.outputRoot;
      await revealDesktopPath(targetPath);
      return {
        handled: true,
        command: parsed.command,
        response: `Opened ${targetPath}.`
      };
    }

    case "search_completed_outputs": {
      const nextSearchText = parsed.searchText?.trim();
      if (!nextSearchText) {
        return {
          handled: true,
          command: parsed.command,
          response: "I can open Find Imports with a search, but I need the clue terms. Example: `find the conversation about docker ports`."
        };
      }

      context.openRetrievalInvestigation({
        filters: {
          text: nextSearchText,
          vendor: parsed.vendor ?? "",
          topic: parsed.topic ?? "",
          status: "all",
          from: "",
          to: ""
        },
        suggestedName: nextSearchText
      });

      return {
        handled: true,
        command: parsed.command,
        response:
          `Opened Find Imports with search text "${nextSearchText}"` +
          `${parsed.vendor ? ` and vendor ${parsed.vendor}` : ""}.`
      };
    }

    case "rebuild_search_index": {
      const response = await triggerAgentIndex({
        outputRoot: context.outputRoot
      });

      if (!response.ok) {
        return {
          handled: true,
          command: parsed.command,
          response: `Quantum could not rebuild the local search index: ${response.error}`
        };
      }

      return {
        handled: true,
        command: parsed.command,
        response: "Quantum started rebuilding the local search index for the current output folder."
      };
    }

    case "open_archive":
      context.setActiveScreen("organized-output");
      return {
        handled: true,
        command: parsed.command,
        response: "Opened Readable Archive."
      };

    case "open_datasets":
      context.setActiveScreen("datasets");
      return {
        handled: true,
        command: parsed.command,
        response: "Opened Datasets."
      };

    case "open_imports":
      context.setActiveScreen("imports");
      return {
        handled: true,
        command: parsed.command,
        response: "Opened Imports."
      };

    default:
      return null;
  }
}

export function parseSupportedCommand(prompt: string): ParsedCommand | null {
  const normalized = prompt.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (includesAny(normalized, ["open archive", "readable archive", "go to archive"])) {
    return { command: "open_archive" };
  }

  if (includesAny(normalized, ["open datasets", "dataset view", "go to datasets"])) {
    return { command: "open_datasets" };
  }

  if (includesAny(normalized, ["open imports", "go to imports", "back to imports"])) {
    return { command: "open_imports" };
  }

  if (includesAny(normalized, ["rebuild index", "reindex", "refresh index", "rebuild search index"])) {
    return { command: "rebuild_search_index" };
  }

  if (includesAny(normalized, ["open output", "open folder", "show files", "open source file", "open output folder"])) {
    return { command: "open_output_location" };
  }

  if (includesAny(normalized, ["check export", "inspect export", "inspect this export", "check this export"])) {
    return {
      command: "inspect_export",
      path: extractPath(prompt)
    };
  }

  if (includesAny(normalized, ["run import", "start import", "import this", "import export"])) {
    return {
      command: "import_export",
      path: extractPath(prompt)
    };
  }

  if (includesAny(normalized, ["find the conversation", "search outputs", "search imports", "look for", "find import"])) {
    const searchText = extractSearchText(prompt);
    return {
      command: "search_completed_outputs",
      searchText,
      vendor: extractVendorHint(normalized),
      topic: extractTopicHint(searchText)
    };
  }

  return null;
}

function includesAny(text: string, candidates: string[]): boolean {
  return candidates.some((candidate) => text.includes(candidate));
}

function extractPath(prompt: string): string | undefined {
  const windowsPathMatch = prompt.match(/[A-Za-z]:\\[^"\r\n]+/);
  if (windowsPathMatch?.[0]) {
    return windowsPathMatch[0].trim();
  }

  const quotedMatch = prompt.match(/"([^"]+)"/);
  if (quotedMatch?.[1]) {
    return quotedMatch[1].trim();
  }

  return undefined;
}

function extractSearchText(prompt: string): string {
  const simplified = prompt
    .replace(/^(please\s+)?/i, "")
    .replace(/\b(find the conversation about|search outputs for|search imports for|look for|find import about)\b/i, "")
    .replace(/\bfrom\s+(chatgpt|claude|grok|gemini|copilot)\b/i, "")
    .trim();

  return simplified;
}

function extractVendorHint(text: string): string | undefined {
  return VENDOR_HINTS.find((vendor) => text.includes(vendor));
}

function extractTopicHint(searchText: string | undefined): string | undefined {
  if (!searchText) {
    return undefined;
  }

  const cleaned = searchText
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 4);

  if (cleaned.length === 0) {
    return undefined;
  }

  return cleaned.slice(0, 2).join(" ");
}
