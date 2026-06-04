import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { exchangeTwitterCode, getTwitterUserHandle, TwitterApiError } from '@/lib/twitter';
import { getCurrentUserId } from '@/lib/auth-session';

const PKCE_COOKIE = 'twitter_code_verifier';
const CSRF_COOKIE = 'twitter_oauth_state';

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
  const codeVerifier = cookieStore.get(PKCE_COOKIE)?.value;

  // Clear cookies regardless of outcome
  cookieStore.delete(CSRF_COOKIE);
  cookieStore.delete(PKCE_COOKIE);

  if (!state || !expectedState || state !== expectedState) {
    console.error('[auth/twitter/callback] CSRF state mismatch');
    return NextResponse.redirect(`${appUrl}/settings?error=oauth_failed`);
  }

  if (!code) {
    console.error('[auth/twitter/callback] Missing code parameter');
    return NextResponse.redirect(`${appUrl}/settings?error=oauth_failed`);
  }

  if (!codeVerifier) {
    console.error('[auth/twitter/callback] Missing PKCE code_verifier cookie');
    return NextResponse.redirect(`${appUrl}/settings?error=oauth_failed`);
  }

  const redirectUri = `${appUrl}/api/auth/twitter/callback`;

  let accessToken: string;
  try {
    const tokenResponse = await exchangeTwitterCode({ code, codeVerifier, redirectUri });
    accessToken = tokenResponse.access_token;
  } catch (err) {
    console.error('[auth/twitter/callback] Token exchange failed:', err);
    return NextResponse.redirect(`${appUrl}/settings?error=oauth_failed`);
  }

  let handle: string;
  try {
    handle = await getTwitterUserHandle(accessToken);
  } catch (err) {
    if (err instanceof TwitterApiError) {
      console.error('[auth/twitter/callback] Failed to fetch user handle:', err.message);
    } else {
      console.error('[auth/twitter/callback] Unexpected error fetching handle:', err);
    }
    return NextResponse.redirect(`${appUrl}/settings?error=oauth_failed`);
  }

  try {
    await prisma.connectedAccount.upsert({
      where: { userId_platform: { userId, platform: 'twitter' } },
      update: {
        handle,
        accessToken,
        tokenInvalid: false,
      },
      create: {
        userId,
        platform: 'twitter',
        handle,
        accessToken,
      },
    });
  } catch (err) {
    console.error('[auth/twitter/callback] DB upsert failed:', err);
    return NextResponse.redirect(`${appUrl}/settings?error=oauth_failed`);
  }

  return NextResponse.redirect(`${appUrl}/settings?connected=twitter`);
}
