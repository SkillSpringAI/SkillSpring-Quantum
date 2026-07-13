import { promises as fs } from "node:fs";
import path from "node:path";

const TRANSIENT_FS_ERROR_CODES = new Set(["UNKNOWN", "EPERM", "EBUSY", "EMFILE", "ENFILE"]);
const ATOMIC_TEMP_FILE_SUFFIX = ".atomic-write.tmp";

export async function readJsonFile<T = unknown>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function writeTextFile(filePath: string, content: string): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await writeTextFileAtomically(filePath, content);
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

export async function writeTextFileAtomically(filePath: string, content: string): Promise<void> {
  const directory = path.dirname(filePath);
  const tempPath = path.join(
    directory,
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}${ATOMIC_TEMP_FILE_SUFFIX}`
  );

  try {
    const handle = await retryFsOperation(() => fs.open(tempPath, "w"));

    try {
      await retryFsOperation(() => handle.writeFile(content, "utf-8"));
      await retryFsOperation(() => handle.sync());
    } finally {
      await handle.close();
    }

    await retryFsOperation(() => fs.rename(tempPath, filePath));
  } catch (error) {
    await cleanupAtomicTempFile(tempPath);
    throw error;
  }
}

async function cleanupAtomicTempFile(tempPath: string): Promise<void> {
  try {
    await fs.unlink(tempPath);
  } catch (error) {
    if (!isMissingFileError(error)) {
      throw error;
    }
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

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  if (!error || typeof error !== "object") {
    return false;
  }

  return "code" in error && String((error as NodeJS.ErrnoException).code ?? "") === "ENOENT";
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
