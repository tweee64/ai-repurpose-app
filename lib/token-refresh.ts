import { prisma } from '@/lib/prisma';
import { refreshLinkedInToken, LinkedInApiError } from '@/lib/linkedin';

const REFRESH_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface ValidLinkedInToken {
  accessToken: string;
}

/**
 * Ensures the LinkedIn access token for a connected account is valid.
 * If the token is within 24 hours of expiry, attempts a refresh and persists the new token.
 * If the refresh fails with a 401, sets tokenInvalid to true on the account.
 * Throws if the account should not be used for posting.
 */
export async function ensureValidLinkedInToken(accountId: string): Promise<ValidLinkedInToken> {
  const account = await prisma.connectedAccount.findUnique({
    where: { id: accountId },
    select: {
      id: true,
      accessToken: true,
      refreshToken: true,
      tokenExpiresAt: true,
      tokenInvalid: true,
    },
  });

  if (!account) {
    throw new Error(`ConnectedAccount ${accountId} not found`);
  }

  if (account.tokenInvalid) {
    throw new LinkedInTokenInvalidError('LinkedIn token is marked as invalid. Please reconnect.');
  }

  // Check if refresh is needed
  const needsRefresh =
    account.tokenExpiresAt !== null &&
    account.tokenExpiresAt.getTime() - Date.now() < REFRESH_WINDOW_MS;

  if (!needsRefresh) {
    return { accessToken: account.accessToken };
  }

  if (!account.refreshToken) {
    // No refresh token available — mark invalid and throw
    await prisma.connectedAccount.update({
      where: { id: accountId },
      data: { tokenInvalid: true },
    });
    throw new LinkedInTokenInvalidError(
      'LinkedIn token is expired and no refresh token is available. Please reconnect.'
    );
  }

  // Attempt token refresh
  try {
    const refreshed = await refreshLinkedInToken(account.refreshToken);

    const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000);

    await prisma.connectedAccount.update({
      where: { id: accountId },
      data: {
        accessToken: refreshed.access_token,
        refreshToken: refreshed.refresh_token,
        tokenExpiresAt: newExpiresAt,
        tokenInvalid: false,
      },
    });

    return { accessToken: refreshed.access_token };
  } catch (err) {
    if (err instanceof LinkedInApiError && err.statusCode === 401) {
      await prisma.connectedAccount.update({
        where: { id: accountId },
        data: { tokenInvalid: true },
      });
      throw new LinkedInTokenInvalidError(
        'LinkedIn token refresh failed. Please reconnect your account.'
      );
    }
    throw err;
  }
}

export class LinkedInTokenInvalidError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LinkedInTokenInvalidError';
  }
}
