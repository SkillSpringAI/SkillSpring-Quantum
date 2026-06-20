import type { MarkdownArchiveResult } from "../types/markdownArchive";
import { invokeDesktopCommand } from "./desktopBridge";

export async function loadMarkdownArchive(
  outputRoot = "organized_output",
  filePath?: string
): Promise<MarkdownArchiveResult> {
  const response = await invokeDesktopCommand<
    { outputRoot: string; filePath?: string },
    MarkdownArchiveResult
  >({
    command: "archive.markdown",
    payload: { outputRoot, filePath }
  });

  if (!response.ok) {
    return {
      outputRoot,
      topics: [],
      selectedFile: null,
      content: "",
      attachmentSummaries: []
    };
  }

  return response.result;
}
