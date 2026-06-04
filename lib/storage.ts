import fs from 'fs/promises';

/**
 * Deletes a temporary file from disk, suppressing errors if the file
 * no longer exists (idempotent cleanup).
 *
 * @param filePath  Absolute path to the file to remove
 */
export async function deleteTempFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (err: unknown) {
    const nodeErr = err as NodeJS.ErrnoException;
    // Ignore "file not found" — anything else is unexpected
    if (nodeErr.code !== 'ENOENT') {
      console.error(`[storage] Failed to delete temp file ${filePath}:`, err);
    }
  }
}
