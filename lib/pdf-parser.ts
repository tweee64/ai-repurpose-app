import { PDFParse } from 'pdf-parse';

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

/**
 * Extracts plain text from a PDF Buffer.
 *
 * Throws a user-readable error for password-protected, corrupt, or
 * oversized PDFs. Server-side only — never import in Client Components.
 */
export async function parsePdf(buffer: Buffer): Promise<string> {
  if (buffer.byteLength > MAX_FILE_SIZE_BYTES) {
    throw new Error('File exceeds the 20 MB limit');
  }

  let result;
  try {
    const parser = new PDFParse({ data: buffer });
    result = await parser.getText();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[pdf-parser] PDFParse error:', message);
    if (
      message.toLowerCase().includes('password') ||
      message.toLowerCase().includes('encrypt')
    ) {
      throw new Error(
        'Could not extract text. The PDF may be password-protected or corrupted.',
      );
    }
    throw new Error(
      'Could not extract text. The PDF may be password-protected or corrupted.',
    );
  }

  const text = result.text?.trim() ?? '';

  if (!text) {
    throw new Error(
      'Could not extract text. The PDF may be password-protected or corrupted.',
    );
  }

  return text;
}
