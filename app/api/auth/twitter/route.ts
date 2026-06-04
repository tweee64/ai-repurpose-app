import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getCurrentUserId } from '@/lib/auth-session';
import { buildTwitterAuthUrl, generatePKCE, generateState } from '@/lib/twitter';

const PKCE_COOKIE = 'twitter_code_verifier';
const CSRF_COOKIE = 'twitter_oauth_state';

export async function GET(request: NextRequest) {
  const clientId = process.env.TWITTER_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;

  if (!clientId) {
    console.error('[auth/twitter] Missing TWITTER_CLIENT_ID or NEXT_PUBLIC_APP_URL');
    return NextResponse.redirect(`${appUrl}/settings?error=oauth_failed`);
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.redirect(`${appUrl}/sign-in`);
  }

  const { codeVerifier, codeChallenge } = generatePKCE();
  const state = generateState();

  const redirectUri = `${appUrl}/api/auth/twitter/callback`;
  const authUrl = buildTwitterAuthUrl({ clientId, redirectUri, state, codeChallenge });

  const cookieStore = await cookies();

  cookieStore.set(PKCE_COOKIE, codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes
    path: '/',
  });

  cookieStore.set(CSRF_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes
    path: '/',
  });

  return NextResponse.redirect(authUrl);
}
