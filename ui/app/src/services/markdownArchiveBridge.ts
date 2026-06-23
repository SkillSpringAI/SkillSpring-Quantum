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

  const result = response.result as Partial<MarkdownArchiveResult>;
  return {
    outputRoot: result.outputRoot ?? outputRoot,
    topics: Array.isArray(result.topics)
      ? result.topics.map((topic) => ({
          ...topic,
          files: Array.isArray(topic.files)
            ? topic.files.map((file) => ({
                ...file,
                attachments: Array.isArray(file.attachments) ? file.attachments : []
              }))
            : []
        }))
      : [],
    selectedFile: result.selectedFile
      ? {
          ...result.selectedFile,
          attachments: Array.isArray(result.selectedFile.attachments) ? result.selectedFile.attachments : []
        }
      : null,
    content: typeof result.content === "string" ? result.content : "",
    attachmentSummaries: Array.isArray(result.attachmentSummaries) ? result.attachmentSummaries : []
  };
}
