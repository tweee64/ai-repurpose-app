import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/auth-session';
import type { UpdateDraftRequest, UpdateDraftResponse, Draft } from '@/types/repurpose';
import { Prisma } from '@/app/generated/prisma/client';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ draftId: string }> }
) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 },
    );
  }

  const { draftId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body', code: 'INVALID_BODY' },
      { status: 400 }
    );
  }

  const { content } = body as UpdateDraftRequest;

  if (typeof content !== 'string' || content.trim().length === 0) {
    return NextResponse.json(
      { error: 'content must be a non-empty string', code: 'INVALID_CONTENT' },
      { status: 400 }
    );
  }

  try {
    const draft = await prisma.draft.update({
      where: { id: draftId, userId },
      data: { content },
    });

    const response: UpdateDraftResponse = { draft: draft as unknown as Draft };
    return NextResponse.json(response);
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2025'
    ) {
      return NextResponse.json(
        { error: 'Draft not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }
    console.error('[PUT /api/drafts/[draftId]]', err);
    return NextResponse.json(
      { error: 'Failed to update draft', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
