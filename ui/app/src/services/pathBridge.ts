import { openDesktopPath } from "./desktopBridge";

export async function revealDesktopPath(targetPath: string): Promise<boolean> {
  const response = await openDesktopPath({ targetPath });
  return response.ok;
}
