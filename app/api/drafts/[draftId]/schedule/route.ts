import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { postTwitterThread, TwitterApiError } from '@/lib/twitter';
import { postLinkedInPost, LinkedInApiError } from '@/lib/linkedin';
import { ensureValidLinkedInToken, LinkedInTokenInvalidError } from '@/lib/token-refresh';
import { getCurrentUserId } from '@/lib/auth-session';
import type { ScheduleDraftRequest, ScheduleDraftResponse, TwitterThreadContent } from '@/types/repurpose';

const PLATFORM_MAP: Record<string, string> = {
  twitter_thread: 'twitter',
  linkedin_post: 'linkedin',
};

export async function POST(
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

  const { scheduledFor } = body as ScheduleDraftRequest;

  if (typeof scheduledFor !== 'string' || !scheduledFor) {
    return NextResponse.json(
      { error: 'scheduledFor must be an ISO 8601 UTC string', code: 'INVALID_SCHEDULED_FOR' },
      { status: 400 }
    );
  }

  const scheduledDate = new Date(scheduledFor);
  if (isNaN(scheduledDate.getTime())) {
    return NextResponse.json(
      { error: 'scheduledFor is not a valid date', code: 'INVALID_SCHEDULED_FOR' },
      { status: 400 }
    );
  }

  const FIVE_MINUTES_MS = 5 * 60 * 1000;
  if (scheduledDate.getTime() < Date.now() + FIVE_MINUTES_MS) {
    return NextResponse.json(
      { error: 'scheduledFor must be at least 5 minutes in the future', code: 'PAST_SCHEDULED_FOR' },
      { status: 400 }
    );
  }

  // Load the draft
  let draft: { id: string; format: string; content: string } | null;
  try {
    draft = await prisma.draft.findUnique({
      where: { id: draftId },
      select: { id: true, format: true, content: true },
    });
  } catch (err) {
    console.error('[schedule] DB error fetching draft:', err);
    return NextResponse.json(
      { error: 'Failed to load draft', code: 'DB_ERROR' },
      { status: 500 }
    );
  }

  if (!draft) {
    return NextResponse.json(
      { error: 'Draft not found', code: 'NOT_FOUND' },
      { status: 404 }
    );
  }

  const platform = PLATFORM_MAP[draft.format];
  if (!platform) {
    return NextResponse.json(
      { error: 'This draft format cannot be published', code: 'UNSUPPORTED_FORMAT' },
      { status: 422 }
    );
  }

  // Look up the connected account for this platform
  let connectedAccount: {
    id: string;
    handle: string;
    accessToken: string;
  } | null;
  try {
    connectedAccount = await prisma.connectedAccount.findUnique({
      where: { userId_platform: { userId, platform } },
      select: { id: true, handle: true, accessToken: true },
    });
  } catch (err) {
    console.error('[schedule] DB error fetching connected account:', err);
    return NextResponse.json(
      { error: 'Failed to load connected account', code: 'DB_ERROR' },
      { status: 500 }
    );
  }

  if (!connectedAccount) {
    const platformLabel = platform === 'twitter' ? 'Twitter' : 'LinkedIn';
    return NextResponse.json(
      {
        error: `No connected ${platformLabel} account found. Please connect your account in Settings.`,
        code: 'NO_CONNECTED_ACCOUNT',
      },
      { status: 422 }
    );
  }

  // Build texts array from draft content
  let texts: string[];
  try {
    if (draft.format === 'twitter_thread') {
      const parsed = JSON.parse(draft.content) as TwitterThreadContent;
      texts = parsed.tweets.map((t) => t.text);
    } else {
      const parsed = JSON.parse(draft.content) as { post: string };
      texts = [parsed.post];
    }
  } catch {
    return NextResponse.json(
      { error: 'Draft content is malformed', code: 'MALFORMED_CONTENT' },
      { status: 422 }
    );
  }

  // Publish via platform API
  let accessToken = connectedAccount.accessToken;

  try {
    if (platform === 'linkedin') {
      // Ensure token is valid (refresh if close to expiry)
      const validToken = await ensureValidLinkedInToken(connectedAccount.id);
      accessToken = validToken.accessToken;
      await postLinkedInPost(accessToken, texts[0]);
    } else {
      await postTwitterThread(accessToken, texts);
    }
  } catch (err) {
    if (err instanceof LinkedInTokenInvalidError) {
      return NextResponse.json(
        {
          error: 'Your LinkedIn token has expired. Please reconnect your account in Settings.',
          code: 'TOKEN_INVALID',
        },
        { status: 422 }
      );
    }

    if (err instanceof TwitterApiError || err instanceof LinkedInApiError) {
      // Mark the token as invalid when the platform returns 401
      if (err.statusCode === 401) {
        try {
          await prisma.connectedAccount.update({
            where: { id: connectedAccount.id },
            data: { tokenInvalid: true },
          });
        } catch (dbErr) {
          console.error('[schedule] Failed to set tokenInvalid after 401:', dbErr);
        }
        return NextResponse.json(
          {
            error: 'Authentication failed. Please reconnect your account in Settings.',
            code: 'AUTH_ERROR',
          },
          { status: 422 }
        );
      }

      const httpStatus = err.statusCode >= 500 ? 502 : 422;
      return NextResponse.json({ error: err.message, code: 'PLATFORM_API_ERROR' }, { status: httpStatus });
    }

    console.error('[schedule] Unexpected error calling platform API:', err);
    return NextResponse.json(
      { error: 'Failed to publish post. Please try again.', code: 'PLATFORM_API_ERROR' },
      { status: 502 }
    );
  }

  // Persist scheduling metadata
  try {
    await prisma.draft.update({
      where: { id: draftId },
      data: {
        scheduledFor: scheduledDate,
        scheduledAt: new Date(),
      },
    });
  } catch (err) {
    console.error('[schedule] DB error updating draft after publishing:', err);
    // The post IS published — return success anyway
  }

  const response: ScheduleDraftResponse = {
    draftId,
    scheduledFor,
  };

  return NextResponse.json(response);
}
