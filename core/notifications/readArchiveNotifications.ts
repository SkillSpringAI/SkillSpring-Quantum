import path from "node:path";
import { promises as fs } from "node:fs";
import { fileExists } from "../utils/fs.js";
import { resolveOutputRoot } from "../utils/paths.js";

interface ArchiveNotification {
  notified_at: string;
  conversation_id: string;
  title?: string;
  topic: string;
  created_at?: string;
  start_index: number;
  end_index: number;
  status: string;
  output_file: string;
  hash: string;
  message: string;
}

function parseJsonl(raw: string): ArchiveNotification[] {
  return raw
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => JSON.parse(line) as ArchiveNotification);
}

async function main(): Promise<void> {
  const outputRoot = resolveOutputRoot(process.argv[2]);
  const limit = Number(process.argv[3] || 20);
  const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : 20;
  const notificationsRoot = path.join(outputRoot, "notifications");
  const eventsFile = path.join(notificationsRoot, "archive-events.jsonl");
  const latestFile = path.join(notificationsRoot, "latest-archive-event.json");

  let events: ArchiveNotification[] = [];
  let latest: ArchiveNotification | null = null;

  if (await fileExists(eventsFile)) {
    const raw = await fs.readFile(eventsFile, "utf-8");
    events = parseJsonl(raw).slice(-safeLimit).reverse();
  }

  if (await fileExists(latestFile)) {
    latest = JSON.parse(await fs.readFile(latestFile, "utf-8")) as ArchiveNotification;
  } else {
    latest = events[0] ?? null;
  }

  console.log(JSON.stringify({
    outputRoot,
    notificationsRoot,
    eventsFile,
    latestFile,
    latest,
    events
  }, null, 2));
}

main().catch((error) => {
  console.error("Read archive notifications failed:", error);
  process.exit(1);
});
