export interface ExtensionPayload {
  source: string;
  title?: string;
  url?: string;
  exportedAt?: string;
}

export function receiveExtensionPayload(payload: ExtensionPayload): void {
  console.log("Extension payload received:", payload);
}
