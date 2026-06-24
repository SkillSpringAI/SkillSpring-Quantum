import { checkDesktopPathExists, openDesktopPath } from "./desktopBridge";

export async function revealDesktopPath(targetPath: string): Promise<boolean> {
  const response = await openDesktopPath({ targetPath });
  return response.ok;
}

export async function desktopPathExists(targetPath: string): Promise<boolean> {
  if (!targetPath.trim()) {
    return false;
  }

  const response = await checkDesktopPathExists({ targetPath });
  if (!response.ok) {
    return false;
  }

  return Boolean(response.result?.exists);
}
