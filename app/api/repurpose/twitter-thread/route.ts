import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateTwitterThread } from '@/lib/claude';
import { getCurrentUserId } from '@/lib/auth-session';
import type {
  GenerateTwitterThreadRequest,
  GenerateTwitterThreadResponse,
  GenerationErrorResponse,
} from '@/types/repurpose';

export async function POST(
  request: NextRequest,
): Promise<NextResponse<GenerateTwitterThreadResponse | GenerationErrorResponse>> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 },
    );
  }

  let body: GenerateTwitterThreadRequest;

  try {
    body = (await request.json()) as GenerateTwitterThreadRequest;
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body', code: 'INVALID_REQUEST' },
      { status: 400 },
    );
  }

  const transcriptId = typeof body?.transcriptId === 'string' ? body.transcriptId.trim() : '';

  if (!transcriptId) {
    return NextResponse.json(
      { error: 'transcriptId is required', code: 'INVALID_REQUEST' },
      { status: 400 },
    );
  }

  const transcript = await prisma.transcript.findUnique({
    where: { id: transcriptId },
  });

  if (!transcript) {
    return NextResponse.json(
      { error: 'Transcript not found', code: 'TRANSCRIPT_NOT_FOUND' },
      { status: 404 },
    );
  }

  let tweets;
  try {
    tweets = await generateTwitterThread(transcript.text);
  } catch (err) {
    console.error('[api/repurpose/twitter-thread] Generation error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';

    if (message === 'Failed to parse thread output') {
      return NextResponse.json(
        { error: 'Failed to parse thread output', code: 'PARSE_ERROR' },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate Twitter thread. Please try again.', code: 'GENERATION_ERROR' },
      { status: 500 },
    );
  }

  let draft;
  try {
    draft = await prisma.draft.create({
      data: {
        userId,
        transcriptId: transcript.id,
        format: 'twitter_thread',
        content: JSON.stringify({ tweets }),
      },
    });
  } catch (err) {
    console.error('[api/repurpose/twitter-thread] DB error saving draft:', err);
    return NextResponse.json(
      { error: 'Failed to save draft. Please try again.', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      draft: {
        id: draft.id,
        userId: draft.userId,
        transcriptId: draft.transcriptId,
        format: draft.format as 'twitter_thread',
        content: draft.content,
        createdAt: draft.createdAt.toISOString(),
        updatedAt: draft.updatedAt.toISOString(),
      },
      tweets,
    },
    { status: 200 },
  );
}
