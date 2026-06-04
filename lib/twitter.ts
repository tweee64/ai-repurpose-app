import { createHash, randomBytes } from 'crypto';

const TWITTER_API_BASE = 'https://api.twitter.com/2';
const TWITTER_AUTH_URL = 'https://twitter.com/i/oauth2/authorize';
const TWITTER_TOKEN_URL = 'https://api.twitter.com/2/oauth2/token';

// ── Type definitions ──────────────────────────────────────────────────────────

export interface TwitterTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

export interface TwitterUserResponse {
  data: {
    id: string;
    username: string;
  };
}

export interface TwitterPostResponse {
  data: {
    id: string;
    text: string;
  };
}

export class TwitterApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = 'TwitterApiError';
  }
}

// ── PKCE helpers ──────────────────────────────────────────────────────────────

export function generatePKCE(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = randomBytes(64).toString('base64url');
  const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
  return { codeVerifier, codeChallenge };
}

export function generateState(): string {
  return randomBytes(16).toString('hex');
}

// ── OAuth helpers ─────────────────────────────────────────────────────────────

export function buildTwitterAuthUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
}): string {
  const { clientId, redirectUri, state, codeChallenge } = params;

  const urlParams = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'tweet.read tweet.write users.read',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return `${TWITTER_AUTH_URL}?${urlParams.toString()}`;
}

export async function exchangeTwitterCode(params: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<TwitterTokenResponse> {
  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET must be set');
  }

  const { code, codeVerifier, redirectUri } = params;

  const body = new URLSearchParams({
    code,
    grant_type: 'authorization_code',
    client_id: clientId,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });

  // Twitter requires Basic auth with client_id:client_secret
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch(TWITTER_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`,
    },
    body: body.toString(),
  });

  if (!res.ok) {
    throw new TwitterApiError('Failed to exchange Twitter authorization code for token.', res.status);
  }

  const data = (await res.json()) as TwitterTokenResponse;

  if (!data.access_token) {
    throw new TwitterApiError('Twitter token exchange returned no access_token.', res.status);
  }

  return data;
}

export async function getTwitterUserHandle(accessToken: string): Promise<string> {
  const res = await fetch(`${TWITTER_API_BASE}/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new TwitterApiError('Failed to fetch Twitter user profile.', res.status);
  }

  const data = (await res.json()) as TwitterUserResponse;

  if (!data.data?.username) {
    throw new TwitterApiError('Twitter /users/me returned no username.', res.status);
  }

  return `@${data.data.username}`;
}

// ── Posting helpers ───────────────────────────────────────────────────────────

export async function postTweet(params: {
  accessToken: string;
  text: string;
  replyToTweetId?: string;
}): Promise<string> {
  const { accessToken, text, replyToTweetId } = params;

  const body: Record<string, unknown> = { text };

  if (replyToTweetId) {
    body.reply = { in_reply_to_tweet_id: replyToTweetId };
  }

  const res = await fetch(`${TWITTER_API_BASE}/tweets`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new TwitterApiError('Failed to post tweet.', res.status);
  }

  const data = (await res.json()) as TwitterPostResponse;

  if (!data.data?.id) {
    throw new TwitterApiError('Twitter POST /tweets returned no tweet id.', res.status);
  }

  return data.data.id;
}

export async function postTwitterThread(accessToken: string, tweets: string[]): Promise<string> {
  if (tweets.length === 0) {
    throw new Error('postTwitterThread requires at least one tweet');
  }

  // Post the first tweet
  let previousTweetId = await postTweet({ accessToken, text: tweets[0] });
  const rootTweetId = previousTweetId;

  // Chain subsequent tweets as replies
  for (let i = 1; i < tweets.length; i++) {
    previousTweetId = await postTweet({
      accessToken,
      text: tweets[i],
      replyToTweetId: previousTweetId,
    });
  }

  return rootTweetId;
}
