export interface TopicSegmentIdentityRecord {
  conversation_id: string;
  topic: string;
  start_index: number;
  end_index: number;
  text: string;
}

interface TopicSegmentIdentityPayload {
  conversation_id: string;
  topic: string;
  start_index: number;
  end_index: number;
  text: string;
}

export function topicSegmentIdentityPayload(
  record: TopicSegmentIdentityRecord
): TopicSegmentIdentityPayload {
  return {
    conversation_id: record.conversation_id,
    topic: record.topic,
    start_index: record.start_index,
    end_index: record.end_index,
    text: record.text
  };
}

export function topicSegmentIdentityKey(
  record: TopicSegmentIdentityRecord
): string {
  return JSON.stringify(topicSegmentIdentityPayload(record));
}
