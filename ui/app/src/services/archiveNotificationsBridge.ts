import type {
  ArchiveNotification,
  ArchiveNotificationsResult
} from "../types/notifications";
import { invokeDesktopCommand } from "./desktopBridge";

export async function loadArchiveNotifications(
  outputRoot = "organized_output",
  limit = 10
): Promise<ArchiveNotificationsResult> {
  const response = await invokeDesktopCommand<
    { outputRoot: string; limit: number },
    ArchiveNotificationsResult
  >({
    command: "notifications.archive",
    payload: { outputRoot, limit }
  });

  if (!response.ok) {
    return {
      outputRoot,
      notificationsRoot: outputRoot + "/notifications",
      eventsFile: outputRoot + "/notifications/archive-events.jsonl",
      latestFile: outputRoot + "/notifications/latest-archive-event.json",
      latest: null,
      events: []
    };
  }

  const result = response.result as Partial<ArchiveNotificationsResult>;
  return {
    outputRoot: result.outputRoot ?? outputRoot,
    notificationsRoot: result.notificationsRoot ?? outputRoot + "/notifications",
    eventsFile: result.eventsFile ?? outputRoot + "/notifications/archive-events.jsonl",
    latestFile: result.latestFile ?? outputRoot + "/notifications/latest-archive-event.json",
    latest: result.latest ?? null,
    events: Array.isArray(result.events) ? result.events : []
  };
}

export function describeArchiveNotification(event: ArchiveNotification): string {
  const topic = event.topic || "uncategorized";
  const title = event.title || "Untitled";
  return title + " -> " + topic + " (" + event.status + ")";
}
