import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getCurrentUserId } from '@/lib/auth-session';
import { buildLinkedInAuthUrl, generateState } from '@/lib/linkedin';

const CSRF_COOKIE = 'linkedin_oauth_state';

export async function GET(_request: NextRequest) {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  const baseUrl = appUrl ?? 'http://localhost:3000';

  if (!clientId) {
    console.error('[auth/linkedin] Missing LINKEDIN_CLIENT_ID or NEXT_PUBLIC_APP_URL');
    return NextResponse.redirect(`${baseUrl}/settings?error=oauth_failed`);
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.redirect(`${baseUrl}/sign-in`);
  }

  const state = generateState();
  const redirectUri = `${baseUrl}/api/auth/linkedin/callback`;
  const authUrl = buildLinkedInAuthUrl({ clientId, redirectUri, state });

  const cookieStore = await cookies();

  cookieStore.set(CSRF_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes
    path: '/',
  });

  return NextResponse.redirect(authUrl);
}
