# 15b - Connect Social Media Account via Direct OAuth (Twitter/X + LinkedIn) — Implementation Plan

## User Story

As a content creator, I want to connect my X (Twitter) and LinkedIn accounts directly via OAuth, so that I can publish drafts to my own social media profiles from the app without relying on a third-party scheduling intermediary.

## Pre-conditions

- Story 07 (User Account Authentication) is complete — `getCurrentUserId()` returns a real session user ID from JWT.
- Story 15 original Buffer OAuth implementation exists in the codebase and must be **replaced** by this plan (not extended).
- The `ConnectedAccount` model exists in `prisma/schema.prisma` but contains Buffer-specific fields (`bufferProfileId`, `bufferAccessToken`) that must be migrated.
- Story 14 (Schedule a Draft for Publishing) scheduling route uses `lib/buffer.ts` and `ConnectedAccount.bufferAccessToken` — both must be updated in tandem.
- Buffer's legacy OAuth API (`bufferapp.com/oauth2/authorize`) is deprecated and non-functional. The existing `app/api/auth/buffer/` routes and `lib/buffer.ts` OAuth helpers are dead code.
- A **Twitter/X developer app** must be registered at [developer.x.com](https://developer.x.com) with:
  - OAuth 2.0 with PKCE enabled
  - "Read and Write" permissions
  - Callback URL: `{APP_URL}/api/auth/twitter/callback`
- A **LinkedIn developer app** must be registered at [developer.linkedin.com](https://developer.linkedin.com) with:
  - `w_member_social` scope approved (required for posting)
  - Callback URL: `{APP_URL}/api/auth/linkedin/callback`

## Design

### Visual Layout

The `/settings` page **already exists** with a `ConnectedAccountsSection`. This plan updates that section to show two separate "Connect" buttons — one for X/Twitter and one for LinkedIn — instead of the single "Connect via Buffer" button.

```
┌─────────────────────────────────────────────────────────────┐
│  Settings                                                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Connected Accounts                                          │
│  Manage your connected social media platforms.              │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  [X icon]  X / Twitter    @yourhandle   [Disconnect]   │ │
│  │            ● Connected                                 │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  [LinkedIn icon] LinkedIn  @yourname    [Disconnect]   │ │
│  │                  ● Connected                           │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌───────────────────────────────┐ ┌──────────────────────┐ │
│  │  [X icon]  Connect X/Twitter  │ │ [Li] Connect LinkedIn│ │
│  └───────────────────────────────┘ └──────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Token expired state (LinkedIn — tokens expire after ~60 days):**
```
┌────────────────────────────────────────────────────────────┐
│  [LinkedIn icon] LinkedIn     @yourname                    │
│                  ⚠ Token expired    [Reconnect]            │
└────────────────────────────────────────────────────────────┘
```

**Disconnect Confirmation Dialog (unchanged from Story 15):**
```
┌────────────────────────────────────────┐
│  Disconnect @yourhandle?          [✕]  │
├────────────────────────────────────────┤
│  This will remove the X / Twitter      │
│  connection and stop future posts      │
│  to this account.                      │
│                                        │
│  [Cancel]          [Disconnect]        │
└────────────────────────────────────────┘
```

### Color and Typography

- **Background Colors**:
  - Primary: `bg-white dark:bg-gray-900`
  - Secondary: `bg-gray-50 dark:bg-gray-800`
- **Typography**:
  - Page heading: `text-2xl font-semibold text-gray-900 dark:text-white`
  - Section heading: `text-lg font-medium text-gray-900 dark:text-white`
  - Description: `text-sm text-gray-500 dark:text-gray-400`
  - Handle text: `text-sm font-medium text-gray-700 dark:text-gray-300`
- **Component-Specific**:
  - Connected badge: shadcn `Badge` `variant="outline"` + `text-green-600 border-green-600`
  - Token invalid badge: shadcn `Badge` `variant="outline"` + `text-amber-600 border-amber-600`
  - Disconnect button: `variant="ghost"` `size="sm"` + `text-red-600 hover:text-red-700`
  - Reconnect button: `variant="outline"` `size="sm"`
  - Connect Twitter button: `variant="default"` `size="sm"` (black/dark background)
  - Connect LinkedIn button: `variant="default"` `size="sm"` (blue background)

### Interaction Patterns

- **"Connect X/Twitter" button click**: Redirects browser to `GET /api/auth/twitter` which generates PKCE challenge + CSRF state, stores both in httpOnly cookies, then redirects to `https://twitter.com/i/oauth2/authorize`.
- **"Connect LinkedIn" button click**: Redirects browser to `GET /api/auth/linkedin` which generates CSRF state, stores in httpOnly cookie, then redirects to `https://www.linkedin.com/oauth/v2/authorization`.
- **OAuth callback (both platforms)**: Platform redirects to `/api/auth/{platform}/callback?code=...`. Handler validates CSRF, exchanges code for tokens, fetches user handle, upserts `ConnectedAccount`, redirects to `/settings?connected={platform}`.
- **Success redirect**: `toast.success("X / Twitter connected!")` or `toast.success("LinkedIn connected!")` shown on return.
- **"Disconnect" button click**: Opens confirmation `AlertDialog`. On confirm, calls `DELETE /api/settings/connected-accounts/[accountId]`. Card is removed on success.
- **"Reconnect" button click** (token invalid): Same flow as initial connect for that platform.
- **Loading state**: `Skeleton` components shown while account list is fetched.

### Measurements and Spacing

```
Container:    max-w-3xl mx-auto px-4 sm:px-6 py-10
Section:      space-y-6
Card:         p-4 md:p-5
Card grid:    flex items-center justify-between gap-4
CTA row:      flex gap-3 flex-wrap
Vertical:     space-y-4
```

### Responsive Behavior

- **Desktop (lg: 1024px+)**: Single-column account card list; "Connect" CTAs side-by-side in a row.
- **Tablet (md: 768px–1023px)**: Same layout, slightly reduced padding.
- **Mobile (< 768px)**: CTA buttons stack vertically (`flex-col`). Account cards remain full-width.

## Technical Requirements

### Component Structure

```
lib/
├── twitter.ts                            # NEW — Twitter OAuth 2.0 + PKCE helpers + posting
├── linkedin.ts                           # NEW — LinkedIn OAuth 2.0 helpers + posting + token refresh
└── token-refresh.ts                      # NEW — LinkedIn token refresh utility

app/
├── api/
│   ├── auth/
│   │   ├── buffer/
│   │   │   ├── route.ts                  # DELETE — deprecated Buffer OAuth initiation
│   │   │   └── callback/
│   │   │       └── route.ts              # DELETE — deprecated Buffer OAuth callback
│   │   ├── twitter/
│   │   │   ├── route.ts                  # NEW — GET: initiate Twitter OAuth 2.0 + PKCE
│   │   │   └── callback/
│   │   │       └── route.ts              # NEW — GET: handle Twitter callback
│   │   └── linkedin/
│   │       ├── route.ts                  # NEW — GET: initiate LinkedIn OAuth 2.0
│   │       └── callback/
│   │           └── route.ts              # NEW — GET: handle LinkedIn callback
│   ├── settings/
│   │   └── connected-accounts/
│   │       ├── route.ts                  # UNCHANGED — GET list accounts
│   │       └── [accountId]/
│   │           └── route.ts              # UNCHANGED — DELETE disconnect
│   └── drafts/
│       └── [draftId]/
│           └── schedule/
│               └── route.ts              # MODIFIED — replace Buffer calls with platform-specific posting
└── settings/
    ├── page.tsx                          # UNCHANGED — settings shell
    └── _components/
        ├── ConnectedAccountsSection.tsx  # MODIFIED — two connect CTAs instead of one
        ├── ConnectedAccountCard.tsx      # MODIFIED — platform-specific reconnect links
        ├── SettingsToastHandler.tsx      # UNCHANGED
        └── useConnectedAccounts.ts       # UNCHANGED

lib/
└── buffer.ts                             # DELETE — entirely replaced by twitter.ts + linkedin.ts

types/
└── connected-account.ts                  # MODIFIED — remove bufferProfileId

prisma/
└── schema.prisma                         # MODIFIED — replace Buffer fields with generic token fields
```

### Required Components

- [ ] `lib/twitter.ts` — PKCE helpers, token exchange, user handle fetch, tweet posting, thread posting
- [ ] `lib/linkedin.ts` — OAuth helpers, token exchange, user handle fetch, post publishing, token refresh
- [ ] `lib/token-refresh.ts` — LinkedIn token refresh check-and-refresh utility
- [ ] `app/api/auth/twitter/route.ts` — Twitter OAuth initiation
- [ ] `app/api/auth/twitter/callback/route.ts` — Twitter OAuth callback handler
- [ ] `app/api/auth/linkedin/route.ts` — LinkedIn OAuth initiation
- [ ] `app/api/auth/linkedin/callback/route.ts` — LinkedIn OAuth callback handler

### State Management Requirements

No new state shape required. The existing `useConnectedAccounts.ts` hook and `ConnectedAccountSummary` type remain the same from the client's perspective — only the backend implementation changes.

```typescript
// types/connected-account.ts (updated — bufferProfileId removed)
interface ConnectedAccountSummary {
  id: string;
  platform: 'twitter' | 'linkedin';
  handle: string;
  tokenInvalid: boolean;
  createdAt: string; // ISO 8601
}
```

## Acceptance Criteria

### Layout & Content

1. Settings Page — Connect CTAs
   - Two separate "Connect" buttons are shown for platforms not yet connected: "Connect X / Twitter" and "Connect LinkedIn".
   - Once a platform is connected, its CTA button is removed and replaced by the `ConnectedAccountCard`.
   - Already-connected platforms show their card regardless of whether the other platform is connected.

2. Connected Account Card (unchanged behaviour)
   - Each card displays: platform icon, platform name, handle (prefixed `@`), "Connected" badge.
   - If `tokenInvalid` is `true`, shows "Token expired" badge and a platform-specific "Reconnect" link.

### Functionality

1. Twitter/X OAuth Flow
   - [ ] Clicking "Connect X / Twitter" redirects the user to the Twitter OAuth 2.0 authorization page using PKCE.
   - [ ] PKCE `code_verifier` and CSRF `state` are generated server-side, stored in httpOnly cookies, and verified in the callback.
   - [ ] Callback exchanges `code` + `code_verifier` for an access token via `POST https://api.twitter.com/2/oauth2/token`.
   - [ ] Callback fetches the Twitter user handle via `GET https://api.twitter.com/2/users/me`.
   - [ ] Callback upserts a `ConnectedAccount` with `platform: 'twitter'`, `handle`, `accessToken`, `tokenInvalid: false`.
   - [ ] Redirects to `/settings?connected=twitter` on success; `/settings?error=oauth_failed` on any error.

2. LinkedIn OAuth Flow
   - [ ] Clicking "Connect LinkedIn" redirects the user to the LinkedIn OAuth 2.0 authorization page with `w_member_social` scope.
   - [ ] CSRF `state` is generated, stored in httpOnly cookie, and verified in the callback.
   - [ ] Callback exchanges `code` for `{ access_token, refresh_token, expires_in }` via `POST https://www.linkedin.com/oauth/v2/accessToken`.
   - [ ] Callback fetches the LinkedIn user profile via `GET https://api.linkedin.com/v2/me`.
   - [ ] Callback upserts a `ConnectedAccount` with `platform: 'linkedin'`, `handle`, `accessToken`, `refreshToken`, `tokenExpiresAt`, `tokenInvalid: false`.
   - [ ] Redirects to `/settings?connected=linkedin` on success; `/settings?error=oauth_failed` on any error.

3. Account Listing (unchanged)
   - [ ] `GET /api/settings/connected-accounts` returns `ConnectedAccountSummary[]` for the current user.
   - [ ] Response never includes `accessToken` or `refreshToken`.

4. Disconnect Flow (unchanged)
   - [ ] `DELETE /api/settings/connected-accounts/[accountId]` removes the record.
   - [ ] Card is removed from UI on success with `toast.success("Account disconnected.")`.

5. Reconnect Flow
   - [ ] Twitter "Reconnect" links to `/api/auth/twitter` (same full OAuth flow).
   - [ ] LinkedIn "Reconnect" links to `/api/auth/linkedin` (same full OAuth flow).
   - [ ] Successful re-auth upserts the record and resets `tokenInvalid` to `false`.

6. Token Refresh — LinkedIn
   - [ ] Before publishing to LinkedIn, `lib/token-refresh.ts` checks `tokenExpiresAt`.
   - [ ] If the token is within 24 hours of expiry, `refreshLinkedInToken(refreshToken)` is called and the `ConnectedAccount` record is updated with the new token and expiry.
   - [ ] If the refresh itself fails (401), `tokenInvalid` is set to `true` and the scheduling route returns a 422 with a reconnect prompt.

7. Publishing from Schedule Route
   - [ ] `POST /api/drafts/[draftId]/schedule` looks up `ConnectedAccount.accessToken` (not `bufferAccessToken`).
   - [ ] For `twitter_thread` format: calls `postTwitterThread(accessToken, tweets[])` — chains `postTweet` calls, each replying to the previous via `in_reply_to_tweet_id`.
   - [ ] For `linkedin_post` format: calls `postLinkedInPost(accessToken, text)`.
   - [ ] Platform 401 → sets `tokenInvalid: true` on the `ConnectedAccount` and returns 422.
   - [ ] Platform 5xx → returns 502.
   - [ ] Note: posts go **live immediately** — true scheduled posting requires a job queue (out of scope for this story; see Notes).

### Navigation Rules

- Connect CTA buttons for both platforms are visible in the Connected Accounts section of `/settings`.
- After OAuth callback, the user is redirected to `/settings?connected={platform}`.
- After OAuth failure, the user is redirected to `/settings?error=oauth_failed`.

### Error Handling

- CSRF state mismatch in any callback → redirect to `/settings?error=oauth_failed`.
- Missing `code` in callback query → redirect to `/settings?error=oauth_failed`.
- Token exchange failure (non-2xx from platform) → log server-side, redirect to `/settings?error=oauth_failed`.
- `toast.error("Failed to connect account. Please try again.")` shown on `/settings` when `?error=oauth_failed` is present.
- All API routes return `{ error: string; code: string }` for 4xx/5xx.
- `accessToken` and `refreshToken` are never included in any API response payload.

## Modified Files

```
prisma/
└── schema.prisma                                      ✅ Migrated ConnectedAccount model

lib/
├── buffer.ts                                          ✅ DELETED
├── twitter.ts                                         ✅ NEW
├── linkedin.ts                                        ✅ NEW
└── token-refresh.ts                                   ✅ NEW

app/
├── api/
│   ├── auth/
│   │   ├── buffer/route.ts                            ✅ DELETED
│   │   ├── buffer/callback/route.ts                   ✅ DELETED
│   │   ├── twitter/route.ts                           ✅ NEW
│   │   ├── twitter/callback/route.ts                  ✅ NEW
│   │   ├── linkedin/route.ts                          ✅ NEW
│   │   └── linkedin/callback/route.ts                 ✅ NEW
│   └── drafts/[draftId]/schedule/route.ts             ✅ Buffer calls replaced
└── settings/
    └── _components/
        ├── ConnectedAccountsSection.tsx               ✅ Two CTAs instead of one Buffer CTA
        └── ConnectedAccountCard.tsx                   ✅ Platform-specific reconnect links

types/
└── connected-account.ts                               ✅ Removed bufferProfileId

.env.example                                           ✅ Swapped Buffer vars → Twitter + LinkedIn vars
```

## Status

[x] COMPLETED

1. Setup & Configuration
   - [x] Register Twitter/X developer app at developer.x.com; enable OAuth 2.0 + PKCE with Read/Write; set callback URL
   - [x] Register LinkedIn developer app at developer.linkedin.com; request `w_member_social` scope; set callback URL
   - [x] Add `TWITTER_CLIENT_ID`, `TWITTER_CLIENT_SECRET`, `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET` to `.env.example`
   - [x] Remove `BUFFER_CLIENT_ID`, `BUFFER_CLIENT_SECRET` from `.env.example`
   - [x] Migrate `ConnectedAccount` in `prisma/schema.prisma`: replace `bufferProfileId`+`bufferAccessToken` with `accessToken`, `refreshToken?`, `tokenExpiresAt?`
   - [x] Run `npx prisma migrate dev` and `npx prisma generate`

2. Backend — Twitter OAuth
   - [x] Create `lib/twitter.ts` with: `buildTwitterAuthUrl()`, `exchangeTwitterCode()`, `getTwitterUserHandle()`, `postTweet()`, `postTwitterThread()`
   - [x] Create `app/api/auth/twitter/route.ts` — PKCE + CSRF, redirect to Twitter authorization URL
   - [x] Create `app/api/auth/twitter/callback/route.ts` — validate CSRF + PKCE, exchange code, fetch handle, upsert ConnectedAccount

3. Backend — LinkedIn OAuth
   - [x] Create `lib/linkedin.ts` with: `buildLinkedInAuthUrl()`, `exchangeLinkedInCode()`, `refreshLinkedInToken()`, `getLinkedInUserHandle()`, `postLinkedInPost()`
   - [x] Create `lib/token-refresh.ts` — `ensureValidLinkedInToken()` for pre-publish refresh check
   - [x] Create `app/api/auth/linkedin/route.ts` — CSRF, redirect to LinkedIn authorization URL
   - [x] Create `app/api/auth/linkedin/callback/route.ts` — validate CSRF, exchange code, fetch handle, upsert ConnectedAccount

4. Backend — Scheduling Route Migration
   - [x] Update `app/api/drafts/[draftId]/schedule/route.ts` to use `accessToken` from ConnectedAccount
   - [x] Call `ensureValidLinkedInToken()` before LinkedIn posts
   - [x] Replace `schedulePost()` (Buffer) with `postTwitterThread()` or `postLinkedInPost()`
   - [x] Update error handling: platform 401 → `tokenInvalid: true`; remove `bufferId`/`bufferStatus` response fields

5. Backend — Cleanup
   - [x] Delete `app/api/auth/buffer/route.ts`
   - [x] Delete `app/api/auth/buffer/callback/route.ts`
   - [x] Delete `lib/buffer.ts`

6. Frontend — Settings UI Updates
   - [x] Update `ConnectedAccountsSection.tsx`: replace "Connect via Buffer" CTA with two buttons ("Connect X / Twitter", "Connect LinkedIn"); hide each CTA once that platform is connected
   - [x] Update `ConnectedAccountCard.tsx`: replace `/api/auth/buffer` reconnect links with `/api/auth/twitter` or `/api/auth/linkedin` based on `account.platform`
   - [x] Update `types/connected-account.ts`: remove `bufferProfileId` from `ConnectedAccountSummary`

7. Testing
   - [ ] Full OAuth round-trip for Twitter/X in local dev (requires approved developer app)
   - [ ] Full OAuth round-trip for LinkedIn in local dev (requires approved app with `w_member_social`)
   - [ ] Verify disconnect removes DB record and card disappears from UI
   - [ ] Verify LinkedIn `tokenInvalid` badge appears and "Reconnect" link points to `/api/auth/linkedin`
   - [ ] Verify Twitter `tokenInvalid` badge appears and "Reconnect" link points to `/api/auth/twitter`
   - [ ] Verify `accessToken` and `refreshToken` are never present in any API response
   - [ ] Verify publishing a Twitter thread correctly chains tweets via `in_reply_to_tweet_id`
   - [ ] Verify publishing a LinkedIn post works end-to-end

## Dependencies

- `TWITTER_CLIENT_ID` + `TWITTER_CLIENT_SECRET` — from developer.x.com app registration
- `LINKEDIN_CLIENT_ID` + `LINKEDIN_CLIENT_SECRET` — from developer.linkedin.com app registration
- `NEXT_PUBLIC_APP_URL` — already in `.env.example`; used to build OAuth redirect URIs
- `lucide-react` — already installed; `Twitter`, `Linkedin` icons
- No new npm packages required — Node.js built-in `crypto` for PKCE + CSRF; `fetch` for platform API calls

## Related Stories

- **Story 15 (original)** — Buffer OAuth implementation; this plan supersedes it entirely.
- **Story 14** (Schedule a Draft for Publishing) — scheduling route must be updated in this plan; linked migration.
- **Story 07** (User Authentication) — prerequisite; real `userId` from session is required for per-user OAuth token storage.

## Notes

### Technical Considerations

1. **PKCE is required for Twitter/X OAuth 2.0** — Twitter does not support the implicit flow. The `code_verifier` (random 128-char string) and `code_challenge` (`BASE64URL(SHA256(code_verifier))`) must be generated server-side. The `code_verifier` must be persisted in an httpOnly cookie between the initiation and callback requests.

2. **LinkedIn tokens expire (~60 days)** — Unlike X tokens (which don't expire unless revoked), LinkedIn access tokens have a finite TTL. The `tokenExpiresAt` field and `ensureValidLinkedInToken()` utility handle proactive refresh. Refresh tokens themselves are valid for 1 year.

3. **Twitter thread posting requires chaining** — The Twitter v2 API has no native "thread" concept for third-party apps. Each tweet in the thread must be posted sequentially, with each tweet's `in_reply_to_tweet_id` set to the ID of the previous tweet. This must be done synchronously in the schedule route.

4. **True scheduling is out of scope** — Neither Twitter nor LinkedIn exposes a native "post at future time" API for third-party apps. This plan posts **immediately** when the user clicks "Publish". A future story would introduce a job queue (e.g. BullMQ + Redis) to support delayed publishing. Story 14's "Schedule" UX may need to be re-framed as "Publish Now" for this MVP.

5. **Token storage security** — `accessToken` and `refreshToken` are stored as plain strings in PostgreSQL (same MVP trade-off as Story 15 original). A production deployment should encrypt tokens at rest using a server-side key. These fields must never be returned in any API response.

6. **Platform developer app approvals** — LinkedIn may require app review before the `w_member_social` scope is granted. X requires a developer account and approved app. Both platforms have rate limits; X's free tier is very restrictive (17 tweet-equivalent writes per day). Test thoroughly in sandbox/dev modes before production.

7. **Scope for X** — Required OAuth scopes: `tweet.read`, `tweet.write`, `users.read`. These must be specified in the authorization URL.

8. **Scope for LinkedIn** — Required OAuth scopes: `openid`, `profile`, `w_member_social`.

9. **No nav integration** — Adding a Settings link to the dashboard header is tracked separately (noted as a gap in the Story 15 analysis). Not in scope here.

### Business Requirements

- Each user connects and manages their **own** Twitter and LinkedIn accounts — tokens are strictly scoped by `userId`.
- At minimum, X/Twitter and LinkedIn must be supported.
- Users must see a "reconnect" prompt if their token expires or is revoked — they must not silently fail at publish time.
- OAuth tokens must never be exposed to the client.

### API Integration

#### Type Definitions

```typescript
// types/connected-account.ts (updated)
export interface ConnectedAccountSummary {
  id: string;
  platform: 'twitter' | 'linkedin';
  handle: string;
  tokenInvalid: boolean;
  createdAt: string; // ISO 8601
}

export interface ConnectedAccountsResponse {
  accounts: ConnectedAccountSummary[];
}

// lib/twitter.ts
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

// lib/linkedin.ts
export interface LinkedInTokenResponse {
  access_token: string;
  expires_in: number;       // seconds
  refresh_token: string;
  refresh_token_expires_in: number;
}

export interface LinkedInUserResponse {
  sub: string;
  name: string;
  given_name: string;
  family_name: string;
}
```

#### Prisma Schema (ConnectedAccount — updated)

```prisma
model ConnectedAccount {
  id              String    @id @default(cuid())
  userId          String
  platform        String    // "twitter" | "linkedin"
  handle          String    // "@yourhandle"
  accessToken     String    // Platform OAuth access token (never returned to client)
  refreshToken    String?   // LinkedIn only — used to refresh expired access tokens
  tokenExpiresAt  DateTime? // LinkedIn only — when the access token expires
  tokenInvalid    Boolean   @default(false) // true when token is revoked/expired
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  user            User      @relation(fields: [userId], references: [id])

  @@unique([userId, platform])
}
```

### Testing Requirements

#### Integration Tests

- Twitter OAuth round-trip: initiation → authorization → callback → `ConnectedAccount` upserted
- LinkedIn OAuth round-trip: initiation → authorization → callback → `ConnectedAccount` upserted with `tokenExpiresAt`
- LinkedIn token refresh: expired token → `ensureValidLinkedInToken()` → new token saved → post succeeds
- Disconnect: DELETE removes record, 404 on re-delete is handled gracefully
- Schedule route: twitter thread posts chain correctly; linkedin post publishes; 401 sets `tokenInvalid: true`

#### Security Tests

- Verify CSRF `state` mismatch in Twitter callback returns redirect to error page
- Verify CSRF `state` mismatch in LinkedIn callback returns redirect to error page
- Verify PKCE `code_verifier` mismatch in Twitter callback is rejected
- Verify `GET /api/settings/connected-accounts` response contains no `accessToken` or `refreshToken` fields
- Verify unauthenticated requests to OAuth routes redirect to sign-in

#### Accessibility

- "Connect X / Twitter" and "Connect LinkedIn" buttons are keyboard-focusable and have descriptive `aria-label` attributes
- Disconnect confirmation `AlertDialog` traps focus correctly
- "Token expired" badge has `role="status"` or is read by screen readers
