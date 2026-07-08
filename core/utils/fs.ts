import { promises as fs } from "node:fs";
import path from "node:path";

const TRANSIENT_FS_ERROR_CODES = new Set(["UNKNOWN", "EPERM", "EBUSY", "EMFILE", "ENFILE"]);

export async function readJsonFile<T = unknown>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function writeTextFile(filePath: string, content: string): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await retryFsOperation(() => fs.writeFile(filePath, content, "utf-8"));
}

export async function appendTextFile(filePath: string, content: string): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await retryFsOperation(() => fs.appendFile(filePath, content, "utf-8"));
}

export async function moveFile(sourcePath: string, destinationPath: string): Promise<void> {
  await ensureDir(path.dirname(destinationPath));
  await retryFsOperation(() => fs.rename(sourcePath, destinationPath));
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function retryFsOperation<T>(operation: () => Promise<T>): Promise<T> {
  const maxAttempts = 6;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isTransientFsError(error) || attempt === maxAttempts) {
        throw error;
      }

      await delay(attempt * 75);
    }
  }

  throw new Error("Retry loop exhausted unexpectedly.");
}

function isTransientFsError(error: unknown): error is NodeJS.ErrnoException {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code = "code" in error ? String((error as NodeJS.ErrnoException).code ?? "") : "";
  return TRANSIENT_FS_ERROR_CODES.has(code);
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
