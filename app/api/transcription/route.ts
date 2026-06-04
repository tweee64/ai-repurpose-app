import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isValidYouTubeUrl } from '@/lib/youtube-url';
import { runTranscriptionJob } from '@/lib/queue/transcription-worker';
import { getCurrentUserId } from '@/lib/auth-session';
import type { SubmitUrlRequest, SubmitUrlResponse, ApiErrorResponse } from '@/types/transcription';

export async function POST(
  request: NextRequest,
): Promise<NextResponse<SubmitUrlResponse | ApiErrorResponse>> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 },
    );
  }

  let body: SubmitUrlRequest;

  try {
    body = (await request.json()) as SubmitUrlRequest;
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body', code: 'INVALID_BODY' },
      { status: 400 },
    );
  }

  const url = typeof body?.url === 'string' ? body.url.trim() : '';

  if (!url) {
    return NextResponse.json(
      { error: 'Please enter a YouTube URL', code: 'URL_REQUIRED' },
      { status: 422 },
    );
  }

  if (!isValidYouTubeUrl(url)) {
    return NextResponse.json(
      { error: 'Please enter a valid YouTube URL', code: 'URL_INVALID' },
      { status: 422 },
    );
  }

  try {
    // Create the job record in a pending state
    const job = await prisma.transcriptionJob.create({
      data: {
        userId,
        sourceType: 'youtube',
        sourceUrl: url,
        status: 'pending',
      },
    });

    // Fire-and-forget: launch the worker without awaiting it
    // Errors are caught inside the worker and persisted to the job record
    runTranscriptionJob(job.id).catch((err) => {
      console.error(`[api/transcription] Unhandled worker error for job ${job.id}:`, err);
    });

    return NextResponse.json({ jobId: job.id }, { status: 201 });
  } catch (err) {
    console.error('[api/transcription] POST error:', err);
    return NextResponse.json(
      { error: 'Failed to create transcription job. Please try again.', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}
