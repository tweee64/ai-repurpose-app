import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/auth-session';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 },
    );
  }

  const { accountId } = await params;

  // Verify the account belongs to the current user before deleting
  let existing: { id: string } | null;
  try {
    existing = await prisma.connectedAccount.findFirst({
      where: { id: accountId, userId },
      select: { id: true },
    });
  } catch (err) {
    console.error('[connected-accounts/delete] DB error:', err);
    return NextResponse.json(
      { error: 'Failed to look up connected account', code: 'DB_ERROR' },
      { status: 500 }
    );
  }

  if (!existing) {
    // Treat as already disconnected — not an error for the client
    return NextResponse.json(
      { error: 'Connected account not found', code: 'NOT_FOUND' },
      { status: 404 }
    );
  }

  try {
    await prisma.connectedAccount.delete({ where: { id: accountId } });
  } catch (err) {
    console.error('[connected-accounts/delete] DB delete error:', err);
    return NextResponse.json(
      { error: 'Failed to disconnect account', code: 'DB_ERROR' },
      { status: 500 }
    );
  }

  return new NextResponse(null, { status: 204 });
}
