import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/auth-session';
import type { JobStatusResponse, ApiErrorResponse } from '@/types/transcription';

interface RouteParams {
  params: Promise<{ jobId: string }>;
}

export async function GET(
  _request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse<JobStatusResponse | ApiErrorResponse>> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 },
    );
  }

  const { jobId } = await params;

  if (!jobId || typeof jobId !== 'string') {
    return NextResponse.json(
      { error: 'Missing job ID', code: 'JOB_ID_REQUIRED' },
      { status: 400 },
    );
  }

  let job;
  try {
    job = await prisma.transcriptionJob.findUnique({
      where: { id: jobId },
      include: { transcript: true },
    });
  } catch (err) {
    console.error('[api/transcription/jobId] DB error:', err);
    return NextResponse.json(
      { error: 'Failed to retrieve job status. Please try again.', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }

  if (!job || job.userId !== userId) {
    return NextResponse.json(
      { error: 'Transcription job not found', code: 'JOB_NOT_FOUND' },
      { status: 404 },
    );
  }

  return NextResponse.json({
    job: {
      id: job.id,
      userId: job.userId,
      sourceType: job.sourceType as 'youtube' | 'blog_url' | 'pdf',
      sourceUrl: job.sourceUrl ?? null,
      fileName: job.fileName ?? null,
      status: job.status as JobStatusResponse['job']['status'],
      errorMessage: job.errorMessage ?? null,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    },
    transcript: job.transcript
      ? {
          id: job.transcript.id,
          jobId: job.transcript.jobId,
          text: job.transcript.text,
          createdAt: job.transcript.createdAt.toISOString(),
        }
      : null,
  });
}
