import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateLinkedInPost } from '@/lib/claude';
import { getCurrentUserId } from '@/lib/auth-session';
import type {
  GenerateLinkedInPostRequest,
  GenerateLinkedInPostResponse,
  GenerationErrorResponse,
} from '@/types/repurpose';

export async function POST(
  request: NextRequest,
): Promise<NextResponse<GenerateLinkedInPostResponse | GenerationErrorResponse>> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 },
    );
  }

  let body: GenerateLinkedInPostRequest;

  try {
    body = (await request.json()) as GenerateLinkedInPostRequest;
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

  let post: string;
  try {
    post = await generateLinkedInPost(transcript.text);
  } catch (err) {
    console.error('[api/repurpose/linkedin-post] Generation error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';

    if (message === 'Failed to parse post output') {
      return NextResponse.json(
        { error: 'Failed to parse post output', code: 'PARSE_ERROR' },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate LinkedIn post. Please try again.', code: 'GENERATION_ERROR' },
      { status: 500 },
    );
  }

  let draft;
  try {
    draft = await prisma.draft.create({
      data: {
        userId,
        transcriptId: transcript.id,
        format: 'linkedin_post',
        content: JSON.stringify({ post }),
      },
    });
  } catch (err) {
    console.error('[api/repurpose/linkedin-post] DB error saving draft:', err);
    return NextResponse.json(
      { error: 'Failed to save draft. Please try again.', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }

  return NextResponse.json({
    draft: {
      id: draft.id,
      userId: draft.userId,
      transcriptId: draft.transcriptId,
      format: draft.format as 'linkedin_post',
      content: draft.content,
      createdAt: draft.createdAt.toISOString(),
      updatedAt: draft.updatedAt.toISOString(),
    },
    post,
  });
}
