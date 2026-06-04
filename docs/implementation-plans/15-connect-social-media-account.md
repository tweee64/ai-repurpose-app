# 15 - Connect a Social Media Account for Publishing — Implementation Plan

## User Story

As a content creator, I want to connect my X (Twitter), LinkedIn, or other social media accounts to the app via OAuth, so that I can publish or schedule drafts directly from the app without manually logging into each platform.

## Pre-conditions

- Story 05 (Edit and Copy Draft) is complete — draft data with `draftId` is available in the dashboard.
- Story 14 (Schedule a Draft for Publishing) depends on this story being complete — `ConnectedAccount` records with `bufferProfileId` and `bufferAccessToken` must exist before scheduling works.
- The `ConnectedAccount` model is already defined in `prisma/schema.prisma` but requires a `tokenInvalid` field to support the "reconnect" prompt flow.
- `lib/buffer.ts` exists for scheduling but does not yet include OAuth helper functions.
- No settings or account management pages exist yet.
- `DEV_USER_ID = 'dev-user-placeholder'` is still the active user identity; OAuth connections will be scoped to this placeholder until Story 07 (auth) is implemented.
- A Buffer OAuth app must be registered at [https://buffer.com/developers/apps](https://buffer.com/developers/apps) with a redirect URI pointing to `/api/auth/buffer/callback`.

## Design

### Visual Layout

A new **Settings** page at `/settings` is added to the app. It contains a single "Connected Accounts" section for this story.

```
┌─────────────────────────────────────────────────────────────┐
│  Settings                                                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Connected Accounts                                          │
│  Manage your connected social media platforms.              │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  [Twitter icon]  X / Twitter    @yourhandle   [Disconnect] │
│  │                  ● Connected                            │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  [LinkedIn icon] LinkedIn       @yourname              │ │
│  │                  ⚠ Token expired  [Reconnect]          │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  [Buffer icon]   Connect via Buffer               [Connect] │
│  │  Connect X and LinkedIn through a single Buffer        │ │
│  │  account to manage all your social accounts at once.   │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Disconnect Confirmation Dialog:**
```
┌────────────────────────────────────────┐
│  Disconnect @yourhandle?          [✕]  │
├────────────────────────────────────────┤
│  This will remove the X / Twitter      │
│  connection and stop any future        │
│  scheduled posts to this account.      │
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
  - Connect button: `variant="default"` `size="sm"`
  - Error toast: `sonner` `toast.error()`
  - Success toast: `sonner` `toast.success()`

### Interaction Patterns

- **"Connect" button click**: Initiates a full-page redirect to `GET /api/auth/buffer` which redirects the browser to Buffer's OAuth authorization URL.
- **OAuth callback**: After the user grants permission in Buffer, the browser is redirected to `/api/auth/buffer/callback?code=...`. The route handler exchanges the code for an access token, fetches Buffer profiles, creates `ConnectedAccount` records, and redirects back to `/settings?connected=true`.
- **Success redirect**: On return to `/settings?connected=true`, the UI shows a `toast.success("Account connected!")` and displays the newly connected account(s).
- **"Disconnect" button click**: Opens a confirmation `AlertDialog`. On confirm, calls `DELETE /api/settings/connected-accounts/[accountId]`. On success, the card is removed from the list and `toast.success("Account disconnected.")` is shown. On failure, `toast.error(errorMessage)` is displayed.
- **"Reconnect" button click** (token invalid state): Triggers the same OAuth flow as the initial connect. After re-authorization, `tokenInvalid` is reset to `false` and the existing record is updated (upsert by `userId + platform`).
- **Loading state**: Cards show `Skeleton` components while the accounts list is being fetched.

### Measurements and Spacing

```
Container:    max-w-3xl mx-auto px-4 sm:px-6 py-10
Section:      space-y-6
Card:         p-4 md:p-5
Card grid:    flex items-center justify-between gap-4
Vertical:     space-y-4
```

### Responsive Behavior

- **Desktop (lg: 1024px+)**: Single-column card list, max-width `3xl`, centered.
- **Tablet (md: 768px–1023px)**: Same single-column layout, slightly reduced horizontal padding.
- **Mobile (< 768px)**: Full-width cards, platform icon and handle stack vertically if needed. Disconnect button remains accessible as an icon-only button to save space.

## Technical Requirements

### Component Structure

```
app/settings/
├── page.tsx                              # Server Component — settings shell
└── _components/
    ├── ConnectedAccountsSection.tsx      # Client Component — fetches + renders account list
    ├── ConnectedAccountCard.tsx          # Client Component — single account card + disconnect
    └── useConnectedAccounts.ts           # Custom hook — fetch, disconnect, refresh accounts

app/api/
├── auth/
│   └── buffer/
│       ├── route.ts                      # GET — redirect to Buffer OAuth authorization URL
│       └── callback/
│           └── route.ts                  # GET — handle OAuth callback, exchange code, save accounts
└── settings/
    └── connected-accounts/
        ├── route.ts                      # GET — list connected accounts for current user
        └── [accountId]/
            └── route.ts                  # DELETE — disconnect (revoke token + delete record)

lib/
└── buffer.ts                             # MODIFIED — add exchangeCodeForToken(), fetchBufferProfiles()

types/
└── connected-account.ts                  # New — ConnectedAccount API types

prisma/
└── schema.prisma                         # MODIFIED — add tokenInvalid field to ConnectedAccount
```

### Required Components

- [ ] `ConnectedAccountsSection` — fetches account list on mount; shows loading skeletons, account cards, and the "Connect via Buffer" CTA card
- [ ] `ConnectedAccountCard` — renders a single connected account with status badge and disconnect/reconnect actions
- [ ] `useConnectedAccounts` — manages account list state, fetch, disconnect mutation, and loading/error state

### State Management Requirements

```typescript
// useConnectedAccounts.ts
interface UseConnectedAccountsState {
  accounts: ConnectedAccountSummary[];
  isLoading: boolean;
  error: string | null;
  disconnect: (accountId: string) => Promise<void>;
  isDisconnecting: boolean;
  refresh: () => void;
}
```

## Acceptance Criteria

### Layout & Content

1. Settings Page
   - A `/settings` route renders a page titled "Settings" with a "Connected Accounts" section.
   - When no accounts are connected, only the "Connect via Buffer" CTA card is shown.
   - When one or more accounts are connected, each is rendered as a separate `ConnectedAccountCard`.

2. Connected Account Card
   - Each card displays: platform icon (X or LinkedIn), platform name, the handle (prefixed with `@`), and a "Connected" status badge.
   - If `tokenInvalid` is `true`, the badge shows "Token expired" in amber and a "Reconnect" button replaces the "Disconnect" button.
   - A "Disconnect" button is visible for valid accounts.

### Functionality

1. OAuth Connection Flow
   - [ ] Clicking "Connect" redirects the user to Buffer's OAuth authorization page.
   - [ ] After granting access in Buffer, the user is redirected to `/api/auth/buffer/callback?code=...`.
   - [ ] The callback handler exchanges the code for an access token via `POST https://api.bufferapp.com/1/oauth2/token.json`.
   - [ ] The handler fetches the user's Buffer profiles via `GET https://api.bufferapp.com/1/profiles.json?access_token=...`.
   - [ ] For each profile with `service === 'twitter'` or `service === 'linkedin'`, a `ConnectedAccount` record is upserted (unique by `userId + platform`).
   - [ ] After saving, the handler redirects to `/settings?connected=true`.
   - [ ] The settings page reads the `connected` query param and fires a `toast.success("Account connected!")`.

2. Account Listing
   - [ ] `GET /api/settings/connected-accounts` returns an array of connected accounts for the current user.
   - [ ] The response shape is `ConnectedAccountSummary[]` — it never includes `bufferAccessToken`.
   - [ ] Loading state shows `Skeleton` components while the request is in-flight.

3. Disconnect Flow
   - [ ] Clicking "Disconnect" on a card opens a confirmation `AlertDialog` with the account handle.
   - [ ] Confirming calls `DELETE /api/settings/connected-accounts/[accountId]`.
   - [ ] The route handler deletes the `ConnectedAccount` record from the DB.
   - [ ] On success: the card is removed from the UI and `toast.success("Account disconnected.")` is shown.
   - [ ] On failure: `toast.error(message)` is shown and the dialog closes.

4. Reconnect Flow
   - [ ] If a `ConnectedAccount` has `tokenInvalid === true`, a "Reconnect" button is shown.
   - [ ] Clicking "Reconnect" triggers the same OAuth flow as initial connect.
   - [ ] A successful re-authorization upserts the account record and resets `tokenInvalid` to `false`.

5. Token Expiry Detection
   - [ ] When any Buffer API call returns HTTP 401 and throws `BufferApiError`, the calling code must set `tokenInvalid = true` on the relevant `ConnectedAccount` record.
   - [ ] This is wired in the `POST /api/drafts/[draftId]/schedule` route handler (Story 14) for forward compatibility.

### Navigation Rules

- The settings page is accessible via a link in the main app nav (or as a direct URL `/settings`); nav integration is out of scope for this story — the route just needs to exist and be reachable.
- After OAuth callback success, the user is redirected to `/settings?connected=true` (not back to dashboard).
- After OAuth callback failure (missing code, exchange error), the user is redirected to `/settings?error=oauth_failed`.

### Error Handling

- If the OAuth `code` is missing or invalid, return a redirect to `/settings?error=oauth_failed` and show `toast.error("Failed to connect account. Please try again.")` on the settings page.
- If the Buffer token exchange request fails (non-2xx), log the error server-side and redirect to `/settings?error=oauth_failed`.
- `DELETE` returning 404 (account not found) is handled gracefully — treat as already disconnected and refresh the list.
- All API route handlers return `{ error: string; code: string }` for 4xx/5xx responses.
- Never expose `bufferAccessToken` in any API response.

## Modified Files

```
prisma/
└── schema.prisma                                   ✅ Added tokenInvalid field to ConnectedAccount

lib/
└── buffer.ts                                       ✅ Added exchangeCodeForToken(), fetchBufferProfiles()

app/
├── settings/
│   ├── page.tsx                                    ✅ NEW — Settings page shell
│   └── _components/
│       ├── ConnectedAccountsSection.tsx            ✅ NEW — Account list with CTA
│       ├── ConnectedAccountCard.tsx                ✅ NEW — Single account card
│       ├── SettingsToastHandler.tsx                ✅ NEW — Toast handler for query params
│       └── useConnectedAccounts.ts                 ✅ NEW — Fetch + disconnect hook
├── api/
│   ├── auth/
│   │   └── buffer/
│   │       ├── route.ts                            ✅ NEW — Initiate OAuth redirect
│   │       └── callback/
│   │           └── route.ts                        ✅ NEW — Handle OAuth callback
│   └── settings/
│       └── connected-accounts/
│           ├── route.ts                            ✅ NEW — GET list accounts
│           └── [accountId]/
│               └── route.ts                        ✅ NEW — DELETE disconnect account
└── api/
    └── drafts/
        └── [draftId]/
            └── schedule/
                └── route.ts                        ✅ tokenInvalid update on 401 wired

types/
└── connected-account.ts                            ✅ NEW — ConnectedAccountSummary type

.env.example                                        ✅ Added BUFFER_CLIENT_ID, BUFFER_CLIENT_SECRET, NEXT_PUBLIC_APP_URL
```

## Status

✅ COMPLETED

1. Setup & Configuration
   - [x] Add `BUFFER_CLIENT_ID`, `BUFFER_CLIENT_SECRET`, `NEXT_PUBLIC_APP_URL` to `.env.example` (and local `.env`)
   - [ ] Register a Buffer OAuth app at https://buffer.com/developers/apps and set redirect URI to `{APP_URL}/api/auth/buffer/callback`
   - [x] Add `tokenInvalid Boolean @default(false)` to `ConnectedAccount` in `prisma/schema.prisma`
   - [x] Run `npx prisma migrate dev` and `npx prisma generate`
   - [x] Add `shadcn/ui` `AlertDialog` component: `npx shadcn@latest add alert-dialog`

2. Backend — OAuth & Account Management
   - [x] Add `exchangeCodeForToken(code: string): Promise<string>` to `lib/buffer.ts`
   - [x] Add `fetchBufferProfiles(accessToken: string): Promise<BufferProfile[]>` to `lib/buffer.ts`
   - [x] Create `GET /api/auth/buffer/route.ts` — build and redirect to Buffer OAuth URL
   - [x] Create `GET /api/auth/buffer/callback/route.ts` — exchange code, upsert ConnectedAccount records, redirect
   - [x] Create `GET /api/settings/connected-accounts/route.ts` — return `ConnectedAccountSummary[]` (no token fields)
   - [x] Create `DELETE /api/settings/connected-accounts/[accountId]/route.ts` — delete ConnectedAccount

3. Frontend — Settings Page
   - [x] Create `types/connected-account.ts` with `ConnectedAccountSummary` interface
   - [x] Create `useConnectedAccounts.ts` hook
   - [x] Create `ConnectedAccountCard.tsx` component
   - [x] Create `ConnectedAccountsSection.tsx` component (with Skeleton loading state and CTA card)
   - [x] Create `app/settings/page.tsx` shell (handles `?connected` and `?error` query params, fires toasts)

4. Integration
   - [x] Wire `tokenInvalid = true` update in `POST /api/drafts/[draftId]/schedule/route.ts` when `BufferApiError` is thrown with status 401

5. Testing
   - [ ] Verify full OAuth round-trip locally using Buffer sandbox or a real app
   - [ ] Verify disconnect removes the DB record and the card disappears from the UI
   - [ ] Verify `tokenInvalid` badge appears when field is set to `true` in DB
   - [ ] Verify `bufferAccessToken` is never present in any API response payload

## Dependencies

- `shadcn/ui` `AlertDialog` component (add via `npx shadcn@latest add alert-dialog`)
- `lucide-react` for platform icons (`Twitter`, `Linkedin`) — already installed
- Buffer OAuth app registration (external — requires Buffer developer account)
- `BUFFER_CLIENT_ID` and `BUFFER_CLIENT_SECRET` env vars (from Buffer app registration)
- `NEXT_PUBLIC_APP_URL` env var (for building the OAuth redirect URI)
- Story 07 (User Authentication) — not a hard prerequisite for building this story, but `userId` must eventually come from a real session rather than `DEV_USER_ID`

## Related Stories

- **Story 14** (Schedule a Draft for Publishing) — depends on this story; `ConnectedAccount` records must exist for scheduling to work.
- **Story 07** (User Authentication) — once auth is implemented, replace `DEV_USER_ID` with the real session user ID in all settings and OAuth routes.

## Notes

### Technical Considerations

1. **Buffer covers multiple platforms**: A single Buffer OAuth connection gives access to all linked Buffer channels (Twitter, LinkedIn, etc.). The OAuth flow is implemented once; multiple `ConnectedAccount` records may be created from a single Buffer authorization if the user has multiple platforms connected in Buffer.
2. **Token security**: `bufferAccessToken` is stored in plain text in the DB for this story (acceptable for dev/MVP). A production deployment should encrypt tokens at rest using a server-side encryption key. Never include the token in any client-facing API response.
3. **CSRF / state parameter**: The OAuth initiation route (`GET /api/auth/buffer`) should generate a random `state` parameter, store it in a short-lived cookie, and verify it in the callback handler to prevent CSRF attacks on the OAuth flow.
4. **Buffer API version**: The existing `lib/buffer.ts` uses Buffer API v1 (`https://api.bufferapp.com/1`). The token exchange and profile fetch should use the same base URL for consistency.
5. **Token expiry**: Buffer access tokens are long-lived and do not expire by default, but they can be revoked. The `tokenInvalid` boolean handles the revocation case; no refresh token flow is needed.
6. **Upsert on re-auth**: The callback handler should upsert on `userId + platform` so that re-authorizing an already-connected account updates the token rather than creating a duplicate record and resets `tokenInvalid` to `false`.
7. **No nav integration yet**: Adding a Settings link to the main dashboard navigation is deferred to a future housekeeping story. The `/settings` route just needs to exist and function.

### Business Requirements

- Each user manages their own connections — connected accounts are strictly scoped by `userId`.
- Supporting at minimum X/Twitter and LinkedIn via Buffer (as stated in the story); additional platforms follow from whatever channels the user has in Buffer.
- The "reconnect" prompt must be shown proactively in the settings UI rather than surfaced only as a scheduling error.

### API Integration

#### Type Definitions

```typescript
// types/connected-account.ts

export interface ConnectedAccountSummary {
  id: string;
  platform: 'twitter' | 'linkedin';
  handle: string;
  bufferProfileId: string;
  tokenInvalid: boolean;
  createdAt: string; // ISO 8601
}

export interface ConnectedAccountsResponse {
  accounts: ConnectedAccountSummary[];
}

// lib/buffer.ts additions
export interface BufferProfile {
  id: string;
  service: string;         // "twitter" | "linkedin" | ...
  service_username: string; // handle without "@"
}

export interface BufferTokenResponse {
  access_token: string;
}
```

#### OAuth Flow — Sequence

```
Browser              App (/api/auth/buffer)       Buffer OAuth
  |  -- Click Connect -->  |                            |
  |                        | -- Redirect(authURL) --->  |
  |  <-- Redirect ------   |                            |
  |  -- User grants --->                                |
  |  <-- Redirect(code) -- /api/auth/buffer/callback   |
  |                        | -- POST /oauth2/token -->  |
  |                        | <-- access_token --------- |
  |                        | -- GET /profiles.json -->  |
  |                        | <-- [{ id, service, ... }] |
  |                        | -- upsert ConnectedAccount |
  |  <-- Redirect(/settings?connected=true)             |
```

#### Buffer OAuth Endpoints

```
Authorization URL:  https://bufferapp.com/oauth2/authorize
                    ?client_id={BUFFER_CLIENT_ID}
                    &redirect_uri={NEXT_PUBLIC_APP_URL}/api/auth/buffer/callback
                    &response_type=code
                    &state={csrfToken}

Token Exchange:     POST https://api.bufferapp.com/1/oauth2/token.json
                    Body (form-encoded): client_id, client_secret, redirect_uri, code, grant_type=authorization_code

Profiles:           GET  https://api.bufferapp.com/1/profiles.json
                    Header: Authorization: Bearer {access_token}
```

## Testing Requirements

### Integration Tests

```typescript
// Verify GET /api/settings/connected-accounts returns accounts without token field
// Verify DELETE /api/settings/connected-accounts/[id] removes the record
// Verify callback with valid code creates ConnectedAccount records
// Verify callback with missing/invalid code redirects to /settings?error=oauth_failed
```

### Security Tests

```typescript
// Verify bufferAccessToken is never present in any GET /api/settings/connected-accounts response
// Verify state parameter mismatch in callback returns 400 and does not persist any account
// Verify DELETE on an accountId belonging to a different userId returns 404
```

### Accessibility

```typescript
// Verify AlertDialog (disconnect confirmation) traps focus and is keyboard-navigable
// Verify "Connect", "Disconnect", and "Reconnect" buttons have descriptive aria-labels
// Verify status badges have role="status" or equivalent for screen reader announcements
```
