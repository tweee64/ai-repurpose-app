# 14 - Publish Draft to Social Media — Implementation Plan

## User Story

As a content creator, I want to publish a generated draft directly to my connected Twitter or LinkedIn account with a single click, so that I can share content from the app without switching to another platform.

> **Implementation note:** The original story described scheduling via Buffer. The backend implementation (`app/api/drafts/[draftId]/schedule/route.ts`) was built using direct Twitter/LinkedIn API posting (Story 15b approach) instead. This plan reflects that reality — the feature is **"Post Now"** with a confirmation dialog, not future-date scheduling via a third-party queue.

## Pre-conditions

- Story 05 (Edit and Copy Draft) is complete — `TwitterThreadDisplay`, `LinkedInPostDisplay`, `useEditDraft`, and `CopyButton` exist and work. ✅
- Story 15b (Direct OAuth) is complete — `ConnectedAccount` records exist in the DB with `platform`, `accessToken`, and `handle` scoped to the current user. ✅
- `app/api/drafts/[draftId]/schedule/route.ts` is implemented — accepts `POST { scheduledFor: string }`, validates the date is ≥5 min in the future, looks up the `ConnectedAccount` for the draft's platform, and posts directly via `postTwitterThread` / `postLinkedInPost`. ✅
- `Draft` model has `bufferId`, `scheduledFor`, `scheduledAt`, `bufferStatus` fields. ✅
- `ScheduleDraftRequest` and `ScheduleDraftResponse` types are defined in `types/repurpose.ts`. ✅
- A valid `draftId` is available in each display component (`draftId` prop is non-null when `generationStatus === 'completed'`). ✅
- `shadcn/ui` `Dialog` and `Button` components are available. ✅
- `sonner` (toast) is wired up in the root layout. ✅
- `lucide-react` is installed (`Send`, `CheckCircle2`, `Loader2` icons available). ✅

## Design

### Visual Layout

Each completed draft panel toolbar gains a **"Post"** button, placed between "Edit" and "Copy":

```
┌──────────────────────────────────────────────────────────────┐
│ [X icon] Twitter Thread   [3 tweets]  [Edit]  [Post]  [Copy]  │
├──────────────────────────────────────────────────────────────┤
│  Tweet 1  …                                                   │
│  Tweet 2  …                                                   │
└──────────────────────────────────────────────────────────────┘
```

Once a draft has been posted, the "Post" button is replaced by a **"Posted"** badge:

```
┌──────────────────────────────────────────────────────────────┐
│ [X icon] Twitter Thread   [3 tweets]  [Edit]  ✅ Posted  [Copy] │
└──────────────────────────────────────────────────────────────┘
```

**Post Confirmation Dialog:**
```
┌───────────────────────────────────────┐
│  Post to Twitter / X              [✕]  │
├───────────────────────────────────────┤
│  Posting as: @yourhandle              │
│                                       │
│  This will publish your thread        │
│  immediately to X / Twitter.          │
│                                       │
│  [Cancel]             [Post Now →]    │
└───────────────────────────────────────┘
```

If no connected account exists for the platform, the dialog shows an error state with no submit button:

```
┌───────────────────────────────────────┐
│  Post to Twitter / X              [✕]  │
├───────────────────────────────────────┤
│  ⚠️  No Twitter account connected.    │
│  Go to Settings to connect your       │
│  account before posting.              │
│                                       │
│  [Close]       [Go to Settings →]     │
└───────────────────────────────────────┘
```

### Color and Typography

- **Background Colors**:
  - Primary: `bg-white dark:bg-gray-900`
  - Secondary: `bg-gray-50 dark:bg-gray-800`
- **Typography**:
  - Dialog title: `text-lg font-semibold text-gray-900 dark:text-white`
  - Handle text: `text-sm text-muted-foreground`
  - Body copy: `text-sm text-foreground`
- **Component-Specific**:
  - Post button: `variant="outline"` `size="sm"` — `Send` icon from `lucide-react`
  - "Post Now" submit: `variant="default"` `size="sm"` — disabled + `Loader2` spinner while posting
  - Cancel / Close: `variant="ghost"` `size="sm"`
  - "Posted" badge: shadcn `Badge` with `variant="outline"` + `text-green-600 border-green-600` + `CheckCircle2` icon
  - Error toast: `sonner` `toast.error()`
  - Success toast: `sonner` `toast.success("Posted successfully!")`

### Interaction Patterns

- **"Post" button click**: Opens `PostNowDialog` with the platform label and connected account handle pre-populated. No async call on open.
- **Cancel / close (✕)**: Closes dialog without any API call. State is reset.
- **"Post Now" submit**: Calls `POST /api/drafts/[draftId]/schedule` with `{ scheduledFor: new Date(Date.now() + 5 * 60 * 1000).toISOString() }` (5 minutes from now, satisfying the backend's minimum). Button shows `Loader2` spinner and becomes disabled. On success (`200`), dialog closes, toolbar shows "Posted" badge, `toast.success("Posted successfully!")` fires. On failure, `toast.error(errorMessage)` fires and the dialog stays open for retry.
- **No connected account state**: Dialog renders the warning state with a "Go to Settings" link (`href="/settings"`); no "Post Now" button rendered.
- **"Posted" badge**: Once posted, the "Post" button is replaced permanently for the session. Clicking the badge has no action (read-only).

### Measurements and Spacing

```
Dialog width:     max-w-sm (384px)
Dialog padding:   p-6
Body spacing:     space-y-3
Button row:       flex justify-end gap-2 mt-6
```

### Responsive Behavior

- **Desktop (lg: 1024px+)**: Dialog centered in viewport; toolbar buttons inline.
- **Tablet (md: 768px–1023px)**: Same as desktop; dialog fits within screen.
- **Mobile (< 768px)**: Dialog takes full screen width; toolbar buttons wrap if needed.

## Technical Requirements

### Component Structure

```
app/dashboard/_components/
├── ScheduleButton.tsx              # Button + "Scheduled" badge, opens dialog
├── ScheduleDatePickerDialog.tsx    # Dialog with date/time picker + submit
└── useScheduleDraft.ts             # Hook: POST /api/drafts/[draftId]/schedule

app/api/drafts/[draftId]/
├── route.ts                        # existing PUT (unchanged)
└── schedule/
    └── route.ts                    # NEW: POST — validate → Buffer API → update Draft

lib/
└── buffer.ts                       # NEW: Buffer API client (schedulePost)

### Component Structure

```
app/dashboard/_components/
├── PostButton.tsx              # "Post" button (pre-post) or "Posted" badge (post-post)
├── PostNowDialog.tsx           # Confirmation dialog with handle + platform label + Post Now submit
└── usePostDraft.ts             # Hook: POST /api/drafts/[draftId]/schedule; manages loading/error/posted state

app/api/drafts/[draftId]/      (already implemented ✅)
└── schedule/
    └── route.ts               # POST — validates → posts via Twitter/LinkedIn API → updates Draft

types/
└── repurpose.ts               # ScheduleDraftRequest / ScheduleDraftResponse already defined ✅

prisma/
└── schema.prisma              # scheduling fields already on Draft model ✅
```

### Required Components

- [ ] `PostButton.tsx` — renders "Post" button (pre-post) or a green "Posted" badge (post-post); opens `PostNowDialog`
- [ ] `PostNowDialog.tsx` — shadcn `Dialog`; shows platform label, connected account handle, confirmation copy, and "Post Now" submit button; renders no-account error state when `NO_CONNECTED_ACCOUNT`
- [ ] `usePostDraft.ts` — custom hook managing `POST /api/drafts/[draftId]/schedule`, `isPosting`, `postError`, `isPosted` state

### State Management Requirements

```typescript
// usePostDraft.ts
interface UsePostDraftResult {
  isPosting: boolean;
  postError: string | null;
  isPosted: boolean;
  postDraft: (draftId: string) => Promise<void>;
  clearError: () => void;
}

// PostButton local state
interface PostButtonState {
  isDialogOpen: boolean;
}
```

## Acceptance Criteria

### Layout & Content

1. **Draft Toolbar**
   - "Schedule" button (Calendar icon + label) appears in the toolbar of `TwitterThreadDisplay` and `LinkedInPostDisplay` when `draftId !== null && generationStatus === 'completed'`.
   - "Schedule" button is positioned after "Edit" and before "Copy".
   - Once scheduled, the button is replaced by a green "Scheduled for [date]" badge.

2. **Schedule Dialog**
   - Dialog title is "Schedule Post".
   - Platform label matches the draft format (e.g. "X / Twitter" or "LinkedIn").
   - Date picker shows the current and future months; past dates are disabled.
   - Time input defaults to 09:00 AM. Users can edit hours and minutes; AM/PM toggleable.
   - Connected account handle (e.g. "@yourhandle") is displayed as read-only info.
   - "Schedule Post" button is disabled until a valid future date/time is selected.

### Functionality

1. **Scheduling Flow**
   - [ ] Clicking "Schedule" opens the dialog with today + 1 day pre-selected.
   - [ ] Selecting a past date/time disables the "Schedule Post" submit button.
   - [ ] Clicking "Schedule Post" sends `POST /api/drafts/[draftId]/schedule` with `{ scheduledFor: string }` (ISO 8601).
   - [ ] While the request is in flight, the "Schedule Post" button shows a spinner and is disabled.
   - [ ] On success (200), the dialog closes, toolbar shows "Scheduled for [date]" badge, and `toast.success("Post scheduled!")` fires.
   - [ ] On failure, the dialog stays open, `toast.error(message)` fires, and the user can retry or cancel.

## Acceptance Criteria

### Layout & Content

1. **Draft Toolbar**
   - "Post" button (`Send` icon + "Post" label) appears in the toolbar of `TwitterThreadDisplay` and `LinkedInPostDisplay` when `draftId !== null && generationStatus === 'completed'`.
   - "Post" button is positioned after "Edit" and before "Copy".
   - Once posted, the button is replaced by a green "Posted" badge (`CheckCircle2` icon + "Posted" label).
   - `BlogPostDisplay` does **not** get a Post button (not supported by the current route).

2. **Post Confirmation Dialog**
   - Dialog title is "Post to [Platform]" (e.g. "Post to Twitter / X" or "Post to LinkedIn").
   - Connected account handle (e.g. "@yourhandle") is displayed as read-only confirmation text.
   - Confirmation copy states that posting is immediate.
   - "Post Now" submit button is present when an account is connected.
   - No-account error state renders a warning message and a "Go to Settings" link instead of the submit button.

### Functionality

1. **Post Flow**
   - [ ] Clicking "Post" opens `PostNowDialog` \u2014 no network call on open.
   - [ ] Clicking "Post Now" calls `POST /api/drafts/[draftId]/schedule` with `{ scheduledFor: new Date(Date.now() + 5 * 60 * 1000).toISOString() }`.
   - [ ] While the request is in flight, the "Post Now" button shows `Loader2` spinner and is disabled.
   - [ ] On success (`200`), the dialog closes, toolbar replaces button with "Posted" badge, and `toast.success("Posted successfully!")` fires.
   - [ ] On failure, the dialog stays open, `toast.error(message)` fires, and the user can retry or cancel.

2. **No Connected Account Guard**
   - [ ] `usePostDraft` fetches the connected account status on dialog open via the existing `/api/settings/connected-accounts` route.
   - [ ] If no `ConnectedAccount` exists for the draft's platform, the dialog renders the warning state with no "Post Now" button and a "Go to Settings" link.

3. **Error Handling**
   - [ ] `401` from route → `toast.error("Authentication failed. Please reconnect your account in Settings.")`
   - [ ] `422 NO_CONNECTED_ACCOUNT` → no-account warning state in dialog (not a toast)
   - [ ] `502` / network error → `toast.error("Failed to post. Please try again.")`

### Navigation Rules

- The dialog is non-blocking (rest of the dashboard remains interactive while it is open).
- Closing the dialog (Escape key, ✕ button, or Cancel) does not navigate away from the page.
- "Go to Settings" link navigates to `/settings`.

### Error Handling

- All errors are caught at the hook boundary; the dialog never crashes.
- Error messages are actionable — they tell the user what to do, not just what failed.
- Access tokens are never logged or exposed in any client-side response.

## Modified Files

```
app/dashboard/_components/
├── PostButton.tsx              ✅  NEW FILE
├── PostNowDialog.tsx           ✅  NEW FILE
├── usePostDraft.ts             ✅  NEW FILE
├── TwitterThreadDisplay.tsx    ✅  add PostButton to toolbar (between Edit and Copy)
└── LinkedInPostDisplay.tsx     ✅  add PostButton to toolbar (between Edit and Copy)

app/api/drafts/[draftId]/
└── schedule/
    └── route.ts                ✅  DONE — no changes needed
```

## Status

✅ COMPLETED

1. New Files
   - [x] Create `app/dashboard/_components/usePostDraft.ts`
     - State: `{ isPosting, postError, isPosted }`
     - `postDraft(draftId)`: sends `POST /api/drafts/[draftId]/schedule` with a `scheduledFor` 5 min in the future; sets `isPosted = true` on `200`
   - [x] Create `app/dashboard/_components/PostNowDialog.tsx`
     - Props: `{ isOpen, onClose, onPosted, draftId, draftFormat }`
     - On open: fetches `/api/settings/connected-accounts` to get `handle` for the platform
     - Renders connected-account confirmation state or no-account warning state
     - "Post Now" button calls `usePostDraft.postDraft(draftId)`; closes dialog on success
   - [x] Create `app/dashboard/_components/PostButton.tsx`
     - Props: `{ draftId, draftFormat }`
     - Renders `<Button variant="outline" size="sm">` with `Send` icon when not posted
     - Renders `<Badge variant="outline" className="text-green-600 border-green-600">` with `CheckCircle2` icon when posted
     - Manages `isDialogOpen` and `isPosted` state locally; renders `<PostNowDialog>`

2. Update Display Components
   - [x] `TwitterThreadDisplay.tsx`: added `<PostButton draftId={draftId!} draftFormat="twitter_thread" />` between Edit and Copy in the `CardAction`; guarded with `canEdit`
   - [x] `LinkedInPostDisplay.tsx`: added `<PostButton draftId={draftId!} draftFormat="linkedin_post" />` between Edit and Copy in the `CardAction`; guarded with `canEdit`

3. Testing
   - [ ] Verify "Post" button appears only when `draftId` is non-null and `generationStatus === 'completed'`
   - [ ] Verify dialog opens without a network call; handle is populated after open
   - [ ] Verify "Post Now" sends the correct request body and disables the button during flight
   - [ ] Verify success path: dialog closes, "Posted" badge appears, success toast fires
   - [ ] Verify error path: dialog stays open, error toast fires, retry is possible
   - [ ] Verify no-account path: warning state with "Go to Settings" link, no "Post Now" button
   - [ ] `BlogPostDisplay` has no "Post" button

## Dependencies

- Story 15b (Direct OAuth) \u2014 `ConnectedAccount` records with `platform`, `accessToken`, and `handle` must exist
- `app/api/settings/connected-accounts/route.ts` \u2014 must return connected accounts for the current user (used to surface handle in dialog)
- `shadcn/ui` `Dialog` component (already installed)
- `lucide-react` `Send`, `CheckCircle2`, `Loader2` icons (already installed)
- `sonner` toast (already wired in layout)

## Related Stories

- 05 (Edit and Copy Draft) \u2014 established the toolbar pattern this story extends
- 15b (Direct OAuth) \u2014 prerequisite; provides `ConnectedAccount` records

## Notes

### Technical Considerations

1. **`scheduledFor` value**: The backend requires `scheduledFor` to be at least 5 minutes in the future. Since this is a "Post Now" feature, the client should send `new Date(Date.now() + 5 * 60 * 1000).toISOString()` as the value \u2014 it satisfies the validation and the post goes out essentially immediately.

2. **Platform mapping**: `draftFormat` maps to platform as follows:
   - `'twitter_thread'` \u2192 `'twitter'` \u2192 dialog title "Post to Twitter / X"
   - `'linkedin_post'` \u2192 `'linkedin'` \u2192 dialog title "Post to LinkedIn"
   - `'blog_post'` \u2192 not supported; no PostButton rendered

3. **Handle fetching**: `PostNowDialog` should fetch `/api/settings/connected-accounts` when it opens (not before) and filter to the relevant platform. Show a skeleton while loading. If the fetch fails, show the no-account warning state as a safe fallback.

4. **`isPosted` persistence**: `isPosted` lives in the `PostButton` component's local state for the session. It does not need to survive page refreshes (Draft history in Story 6 will handle persistence).

5. **Twitter thread posting**: The route already handles posting multiple tweets via `postTwitterThread`; the UI just fires one request for the whole `draftId` \u2014 no per-tweet iteration needed on the client.

### Business Requirements

- The "Post" action must be irreversible from the UI's perspective \u2014 once "Posted" badge shows, there is no undo button.
- Error messages surfaced to the user must be actionable (tell them to reconnect their account, not just "something went wrong").

### API Integration

#### Type Definitions (already in `types/repurpose.ts` ✅)

```typescript
export interface ScheduleDraftRequest {
  scheduledFor: string; // ISO 8601 UTC — send Date.now() + 5 min from client
}

export interface ScheduleDraftResponse {
  draftId: string;
  scheduledFor: string; // ISO 8601 UTC echo
}
```

#### Request / Response Examples

**`POST /api/drafts/cmp123/schedule`**

Request body (client sends ~5 min from now):
```json
{
  "scheduledFor": "2026-06-01T14:05:00.000Z"
}
```

Success response (`200 OK`):
```json
{
  "draftId": "cmp123",
  "scheduledFor": "2026-06-01T14:05:00.000Z"
}
```

Error — no account (`422`):
```json
{
  "error": "No connected Twitter account found. Please connect your account in Settings.",
  "code": "NO_CONNECTED_ACCOUNT"
}
```

Error — platform API failure (`502`):
```json
{
  "error": "Failed to publish post. Please try again.",
  "code": "PLATFORM_API_ERROR"
}
```

### Testing Requirements

#### Accessibility

```
// PostNowDialog
// - Dialog has aria-labelledby pointing to the dialog title
// - "Post Now" button has aria-disabled when isPosting is true
// - Error states render with role="alert" for screen readers
```

#### Performance

```
// - Dialog opens in < 100ms (no network call on open)
// - Handle fetch resolves in < 500ms (local DB lookup via connected-accounts route)
// - POST /api/drafts/[draftId]/schedule responds in < 5000ms (platform API latency)
```
