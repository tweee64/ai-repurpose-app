import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/auth-session';
import type { ConnectedAccountSummary, ConnectedAccountsResponse } from '@/types/connected-account';

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 },
    );
  }

  let accounts: {
    id: string;
    platform: string;
    handle: string;
    tokenInvalid: boolean;
    createdAt: Date;
  }[];

  try {
    accounts = await prisma.connectedAccount.findMany({
      where: { userId },
      select: {
        id: true,
        platform: true,
        handle: true,
        tokenInvalid: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  } catch (err) {
    console.error('[connected-accounts] DB error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch connected accounts', code: 'DB_ERROR' },
      { status: 500 }
    );
  }

  const summaries: ConnectedAccountSummary[] = accounts.map((a) => ({
    id: a.id,
    platform: a.platform as ConnectedAccountSummary['platform'],
    handle: a.handle,
    tokenInvalid: a.tokenInvalid,
    createdAt: a.createdAt.toISOString(),
  }));

  const response: ConnectedAccountsResponse = { accounts: summaries };
  return NextResponse.json(response);
}
