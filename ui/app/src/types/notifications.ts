export interface ArchiveNotification {
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

export interface ArchiveNotificationsResult {
  outputRoot: string;
  notificationsRoot: string;
  eventsFile: string;
  latestFile: string;
  latest: ArchiveNotification | null;
  events: ArchiveNotification[];
}
