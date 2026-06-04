import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { runIngestionJob } from '@/lib/queue/ingestion-worker';
import { getCurrentUserId } from '@/lib/auth-session';
import type { IngestionJobResponse } from '@/types/ingestion';
import type { ApiErrorResponse } from '@/types/transcription';

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

export async function POST(
  request: NextRequest,
): Promise<NextResponse<IngestionJobResponse | ApiErrorResponse>> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 },
    );
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body', code: 'INVALID_BODY' },
      { status: 400 },
    );
  }

  const sourceType = formData.get('sourceType');

  if (!sourceType || typeof sourceType !== 'string') {
    return NextResponse.json(
      { error: 'sourceType is required', code: 'INVALID_BODY' },
      { status: 400 },
    );
  }

  if (sourceType !== 'blog_url' && sourceType !== 'pdf') {
    return NextResponse.json(
      { error: 'sourceType must be "blog_url" or "pdf"', code: 'INVALID_BODY' },
      { status: 400 },
    );
  }

  // ── Blog URL ingestion ──────────────────────────────────────────────────────
  if (sourceType === 'blog_url') {
    const url = formData.get('url');

    if (!url || typeof url !== 'string' || !url.trim()) {
      return NextResponse.json(
        { error: 'url is required for blog_url ingestion', code: 'URL_REQUIRED' },
        { status: 422 },
      );
    }

    const trimmedUrl = url.trim();

    let parsed: URL;
    try {
      parsed = new URL(trimmedUrl);
    } catch {
      return NextResponse.json(
        { error: 'Please enter a valid URL', code: 'URL_INVALID' },
        { status: 422 },
      );
    }

    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return NextResponse.json(
        { error: 'Please enter a valid URL', code: 'URL_INVALID' },
        { status: 422 },
      );
    }

    try {
      const job = await prisma.transcriptionJob.create({
        data: {
          userId,
          sourceType: 'blog_url',
          sourceUrl: trimmedUrl,
          status: 'pending',
        },
      });

      runIngestionJob(job.id).catch((err) => {
        console.error(`[api/ingestion] Unhandled worker error for job ${job.id}:`, err);
      });

      return NextResponse.json({ jobId: job.id }, { status: 202 });
    } catch (err) {
      console.error('[api/ingestion] DB error (blog_url):', err);
      return NextResponse.json(
        { error: 'Failed to create ingestion job. Please try again.', code: 'INTERNAL_ERROR' },
        { status: 500 },
      );
    }
  }

  // ── PDF ingestion ───────────────────────────────────────────────────────────
  const file = formData.get('file');

  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: 'file is required for pdf ingestion', code: 'FILE_REQUIRED' },
      { status: 422 },
    );
  }

  if (file.type !== 'application/pdf') {
    return NextResponse.json(
      { error: 'Only PDF files are accepted', code: 'INVALID_FILE_TYPE' },
      { status: 422 },
    );
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: 'File exceeds the 20 MB limit', code: 'FILE_TOO_LARGE' },
      { status: 413 },
    );
  }

  try {
    const job = await prisma.transcriptionJob.create({
      data: {
        userId,
        sourceType: 'pdf',
        fileName: file.name,
        status: 'pending',
      },
    });

    // Read PDF into buffer synchronously before firing the worker
    const arrayBuffer = await file.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);

    runIngestionJob(job.id, pdfBuffer).catch((err) => {
      console.error(`[api/ingestion] Unhandled worker error for job ${job.id}:`, err);
    });

    return NextResponse.json({ jobId: job.id }, { status: 202 });
  } catch (err) {
    console.error('[api/ingestion] DB error (pdf):', err);
    return NextResponse.json(
      { error: 'Failed to create ingestion job. Please try again.', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}
