import { randomBytes } from 'crypto';

const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const LINKEDIN_API_BASE = 'https://api.linkedin.com/v2';
const LINKEDIN_USERINFO_URL = 'https://api.linkedin.com/v2/userinfo';

// ── Type definitions ──────────────────────────────────────────────────────────

export interface LinkedInTokenResponse {
  access_token: string;
  expires_in: number; // seconds
  refresh_token: string;
  refresh_token_expires_in: number;
}

export interface LinkedInUserResponse {
  sub: string;
  name: string;
  given_name: string;
  family_name: string;
}

export class LinkedInApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = 'LinkedInApiError';
  }
}

// ── OAuth helpers ─────────────────────────────────────────────────────────────

export function generateState(): string {
  return randomBytes(16).toString('hex');
}

export function buildLinkedInAuthUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const { clientId, redirectUri, state } = params;

  const urlParams = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'openid profile',
    state,
  });

  return `${LINKEDIN_AUTH_URL}?${urlParams.toString()}`;
}

export async function exchangeLinkedInCode(params: {
  code: string;
  redirectUri: string;
}): Promise<LinkedInTokenResponse> {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET must be set');
  }

  const { code, redirectUri } = params;

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(LINKEDIN_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    throw new LinkedInApiError('Failed to exchange LinkedIn authorization code for token.', res.status);
  }

  const data = (await res.json()) as LinkedInTokenResponse;

  if (!data.access_token) {
    throw new LinkedInApiError('LinkedIn token exchange returned no access_token.', res.status);
  }

  return data;
}

export async function refreshLinkedInToken(refreshToken: string): Promise<LinkedInTokenResponse> {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET must be set');
  }

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(LINKEDIN_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    throw new LinkedInApiError('Failed to refresh LinkedIn token.', res.status);
  }

  const data = (await res.json()) as LinkedInTokenResponse;

  if (!data.access_token) {
    throw new LinkedInApiError('LinkedIn token refresh returned no access_token.', res.status);
  }

  return data;
}

export async function getLinkedInUserHandle(accessToken: string): Promise<string> {
  const res = await fetch(LINKEDIN_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new LinkedInApiError('Failed to fetch LinkedIn user profile.', res.status);
  }

  const data = (await res.json()) as LinkedInUserResponse;

  const name = data.name ?? [data.given_name, data.family_name].filter(Boolean).join(' ');

  if (!name) {
    throw new LinkedInApiError('LinkedIn /userinfo returned no name.', res.status);
  }

  return name;
}

export async function postLinkedInPost(accessToken: string, text: string): Promise<void> {
  // Fetch the member URN from the userinfo endpoint
  const userinfoRes = await fetch(LINKEDIN_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!userinfoRes.ok) {
    throw new LinkedInApiError('Failed to fetch LinkedIn member URN.', userinfoRes.status);
  }

  const userinfo = (await userinfoRes.json()) as LinkedInUserResponse;
  const authorUrn = `urn:li:person:${userinfo.sub}`;

  const body = {
    author: authorUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text },
        shareMediaCategory: 'NONE',
      },
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
    },
  };

  const res = await fetch(`${LINKEDIN_API_BASE}/ugcPosts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new LinkedInApiError('Failed to publish LinkedIn post.', res.status);
  }
}
