import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { exchangeLinkedInCode, getLinkedInUserHandle, LinkedInApiError } from '@/lib/linkedin';
import { getCurrentUserId } from '@/lib/auth-session';

const CSRF_COOKIE = 'linkedin_oauth_state';

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  const { searchParams } = request.nextUrl;

  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.redirect(`${appUrl}/sign-in`);
  }

  const code = searchParams.get('code');
  const state = searchParams.get('state');

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(CSRF_COOKIE)?.value;

  // Clear cookie regardless of outcome
  cookieStore.delete(CSRF_COOKIE);

  if (!state || !expectedState || state !== expectedState) {
    console.error('[auth/linkedin/callback] CSRF state mismatch');
    return NextResponse.redirect(`${appUrl}/settings?error=oauth_failed`);
  }

  if (!code) {
    console.error('[auth/linkedin/callback] Missing code parameter');
    return NextResponse.redirect(`${appUrl}/settings?error=oauth_failed`);
  }

  const redirectUri = `${appUrl}/api/auth/linkedin/callback`;

  let tokenResponse: Awaited<ReturnType<typeof exchangeLinkedInCode>>;
  try {
    tokenResponse = await exchangeLinkedInCode({ code, redirectUri });
  } catch (err) {
    console.error('[auth/linkedin/callback] Token exchange failed:', err);
    return NextResponse.redirect(`${appUrl}/settings?error=oauth_failed`);
  }

  const { access_token, refresh_token, expires_in } = tokenResponse;
  const tokenExpiresAt = new Date(Date.now() + expires_in * 1000);

  let handle: string;
  try {
    handle = await getLinkedInUserHandle(access_token);
  } catch (err) {
    if (err instanceof LinkedInApiError) {
      console.error('[auth/linkedin/callback] Failed to fetch user handle:', err.message);
    } else {
      console.error('[auth/linkedin/callback] Unexpected error fetching handle:', err);
    }
    return NextResponse.redirect(`${appUrl}/settings?error=oauth_failed`);
  }

  try {
    await prisma.connectedAccount.upsert({
      where: { userId_platform: { userId, platform: 'linkedin' } },
      update: {
        handle,
        accessToken: access_token,
        refreshToken: refresh_token,
        tokenExpiresAt,
        tokenInvalid: false,
      },
      create: {
        userId,
        platform: 'linkedin',
        handle,
        accessToken: access_token,
        refreshToken: refresh_token,
        tokenExpiresAt,
      },
    });
  } catch (err) {
    console.error('[auth/linkedin/callback] DB upsert failed:', err);
    return NextResponse.redirect(`${appUrl}/settings?error=oauth_failed`);
  }

  return NextResponse.redirect(`${appUrl}/settings?connected=linkedin`);
}
