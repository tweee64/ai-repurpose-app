# 05 Edit and Copy a Generated Draft — Implementation Plan

## User Story

As a content creator, I want to edit a generated draft inline and copy the final version to my clipboard, so that I can make quick adjustments before publishing without leaving the app or switching to another editor.

## Pre-conditions

- Story 03 (Twitter Thread generation) and Story 04 (LinkedIn Post generation) are completed and merged — `TwitterThreadDisplay` and `LinkedInPostDisplay` components exist.
- The `Draft` model is persisted in the database with a stable `id` (delivered via `SseDoneEvent.draftId` from the SSE stream).
- `draftId` is stored in `TwitterStreamState.draftId` and `LinkedInStreamState.draftId` and passed as a prop to each display component.
- `shadcn/ui` `Textarea` component is installed at `components/ui/textarea.tsx`.
- `lib/utils.ts` (`cn` helper) is available.

## Design

### Visual Layout

Each generated draft panel (`TwitterThreadDisplay` / `LinkedInPostDisplay`) gains a toolbar row in its `CardHeader`:

```
┌─────────────────────────────────────────────────────────┐
│ [X icon] Twitter Thread            [3 tweets] [Edit] [Copy] │
├─────────────────────────────────────────────────────────┤
│  Tweet 1  …                                              │
│  Tweet 2  …                                              │
└─────────────────────────────────────────────────────────┘
```

**Edit mode** (after pressing "Edit"):
```
┌─────────────────────────────────────────────────────────┐
│ [X icon] Twitter Thread            [3 tweets] [Cancel] [Save] │
├─────────────────────────────────────────────────────────┤
│  Tweet 1  [ editable textarea ──────── ]  280/280       │
│  Tweet 2  [ editable textarea ──────── ]  240/280       │
│  + Revert to original (link/button, only if changes exist) │
└─────────────────────────────────────────────────────────┘
```

### Color and Typography

- **Background Colors**:
  - Primary: `bg-white dark:bg-gray-900`
  - Secondary: `bg-gray-50 dark:bg-gray-800`
- **Typography**:
  - Headings: `font-inter text-2xl font-semibold text-gray-900 dark:text-white`
  - Body: `font-inter text-base text-gray-600 dark:text-gray-300`
- **Component-Specific**:
  - Cards: `bg-white dark:bg-gray-800 shadow-md`
  - Edit button: `variant="outline"` (small, `size="sm"`)
  - Save button: `variant="default"` (small, `size="sm"`)
  - Cancel button: `variant="ghost"` (small, `size="sm"`)
  - Copy button: `variant="outline"` (small, `size="sm"`) — label flips to `"Copied!"` for 2 s then reverts
  - Textarea: matches `bg-background border-input` from shadcn defaults

### Interaction Patterns

- **Edit toggle**: Click "Edit" → all tweet texts / post text become `<Textarea>` elements pre-populated with current saved content. Header buttons swap to "Cancel" + "Save".
- **Cancel**: Discards local edits and returns to read-only view without making any API call.
- **Save**: Sends `PUT /api/drafts/[draftId]` with serialised content. While saving, "Save" shows a spinner and is disabled. On success, exits edit mode and updates local display. On error, shows inline error message and stays in edit mode.
- **Copy**: Calls `navigator.clipboard.writeText(...)`. Button label changes to `"Copied!"` for 2 seconds via `setTimeout`, then reverts to `"Copy"`.
- **Revert to original**: Replaces edit-mode textarea content with the original AI-generated text (stored in component state at the moment Edit was first opened). Does not save automatically — user must still click Save.

### Measurements and Spacing

```
Container:    max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
Card actions: gap-2 (between Edit/Copy or Cancel/Save buttons)
Textarea:     w-full min-h-[80px] resize-y (tweets), min-h-[200px] (LinkedIn)
Char counter: text-xs text-right mt-1
```

### Responsive Behavior

- **Desktop (lg: 1024px+)**: Edit/Copy buttons sit in `CardAction` area right of the title on the same row.
- **Tablet (md: 768px–1023px)**: Same layout; buttons remain inline.
- **Mobile (< 768px)**: Buttons wrap below title; `CardHeader` switches to `flex-col gap-2`.

## Technical Requirements

### Component Structure

```
app/dashboard/_components/
├── TwitterThreadDisplay.tsx        # Modified — add Edit/Copy toolbar, delegate to EditableTweetCard
├── LinkedInPostDisplay.tsx         # Modified — add Edit/Copy toolbar, inline editable textarea
├── EditableTweetCard.tsx           # New — tweet card with read/edit mode
├── CopyButton.tsx                  # New — reusable copy-to-clipboard button with flash feedback
└── useEditDraft.ts                 # New — hook: save draft via PUT /api/drafts/[draftId]

app/api/drafts/
└── [draftId]/
    └── route.ts                    # New — PUT handler to update draft content

types/
└── repurpose.ts                    # Modified — add UpdateDraftRequest, UpdateDraftResponse
```

### Required Components

- [ ] `EditableTweetCard` — Renders a single tweet in read-only or edit mode; receives `isEditing`, `tweet`, `onChange` props.
- [ ] `CopyButton` — Wraps a shadcn `Button`; accepts `getText: () => string`; handles clipboard API + "Copied!" flash.
- [ ] `useEditDraft` — Returns `{ saveDraft, isSaving, saveError }`.
- [ ] `PUT /api/drafts/[draftId]/route.ts` — Validates body, updates `Draft.content` via Prisma, returns updated draft.
- [ ] `TwitterThreadDisplay` (modified) — Gains `draftId` prop, manages `isEditing` / `editedTweets` / `originalTweets` state.
- [ ] `LinkedInPostDisplay` (modified) — Gains `draftId` prop, manages `isEditing` / `editedPost` / `originalPost` state.

### State Management Requirements

```typescript
// TwitterThreadDisplay local state
interface TwitterEditState {
  isEditing: boolean;
  editedTweets: Tweet[];          // mutable copy during edit session
  originalTweets: Tweet[];        // snapshot taken when Edit is first pressed
  isSaving: boolean;
  saveError: string | null;
}

// LinkedInPostDisplay local state
interface LinkedInEditState {
  isEditing: boolean;
  editedPost: string;             // mutable copy during edit session
  originalPost: string;           // snapshot taken when Edit is first pressed
  isSaving: boolean;
  saveError: string | null;
}

// useEditDraft hook return shape
interface UseEditDraftReturn {
  saveDraft: (draftId: string, content: string) => Promise<void>;
  isSaving: boolean;
  saveError: string | null;
}
```

## Acceptance Criteria

### Layout & Content

1. **Twitter Thread panel**
   - "Edit" and "Copy" buttons are visible in the card header when `generationStatus === 'completed'` and `draftId` is non-null.
   - Buttons are hidden while `generationStatus === 'streaming' | 'generating'`.

2. **LinkedIn Post panel**
   - Same "Edit" and "Copy" visibility rules as Twitter Thread.

### Functionality

1. **Edit mode — enter/exit**
   - [ ] Clicking "Edit" switches the panel to edit mode; tweet texts become `<Textarea>` elements, post text becomes a `<Textarea>`.
   - [ ] Clicking "Cancel" in edit mode discards changes and returns to read-only view; no API call is made.
   - [ ] "Edit" and "Copy" buttons are replaced by "Cancel" and "Save" buttons while in edit mode.

2. **Edit mode — save**
   - [ ] Clicking "Save" calls `PUT /api/drafts/[draftId]` with the serialised JSON content.
   - [ ] While saving, "Save" is disabled and shows a loading spinner (or "Saving…" label).
   - [ ] On success, the panel exits edit mode and displays the newly saved content.
   - [ ] On API error, an inline error message appears below the textarea(s) and edit mode is preserved.

3. **Revert to original**
   - [ ] A "Revert to original" button appears in edit mode when `editedTweets !== originalTweets` (or `editedPost !== originalPost`).
   - [ ] Clicking it replaces textarea content with the original AI-generated text.
   - [ ] It does not auto-save — the user must click "Save" to persist the revert.

4. **Copy**
   - [ ] Clicking "Copy" writes all tweet texts (joined by `\n\n`) or the full LinkedIn post text to the clipboard.
   - [ ] Button label changes to "Copied!" for 2 seconds then reverts to "Copy".
   - [ ] "Copy" uses the latest saved content (not unsaved edit-mode changes).

5. **Isolation**
   - [ ] Editing or saving the Twitter Thread draft does not change the LinkedIn Post draft state, and vice versa.

### Navigation Rules

- Navigating away (e.g., refresh) while in edit mode discards unsaved changes — no browser prompt is required for MVP.

### Error Handling

- API errors from `PUT /api/drafts/[draftId]` render an inline `<p className="text-sm text-destructive">` below the save button.
- `navigator.clipboard.writeText` failures are silently swallowed for MVP (clipboard API unavailable in non-HTTPS or insecure contexts is an edge case).
- Route handler returns `{ error: string; code: string }` for 400 (invalid body), 404 (draft not found), and 500.

## Modified Files

```
app/
  api/
    drafts/
      [draftId]/
        route.ts                     ✅  NEW — PUT /api/drafts/[draftId]
  dashboard/
    _components/
      TwitterThreadDisplay.tsx       ✅  MODIFIED — add draftId prop, edit/copy state
      LinkedInPostDisplay.tsx        ✅  MODIFIED — add draftId prop, edit/copy state
      EditableTweetCard.tsx          ✅  NEW — single tweet in read/edit mode
      CopyButton.tsx                 ✅  NEW — clipboard button with "Copied!" flash
      useEditDraft.ts                ✅  NEW — save draft hook
types/
  repurpose.ts                       ✅  MODIFIED — add UpdateDraftRequest, UpdateDraftResponse
```

## Status

✅ COMPLETED

1. Setup & Configuration
   - [ ] Install `shadcn/ui` Textarea if not already present: `npx shadcn@latest add textarea`
   - [ ] Verify `components/ui/textarea.tsx` exists

2. API Layer
   - [ ] Add `UpdateDraftRequest` and `UpdateDraftResponse` to `types/repurpose.ts`
   - [ ] Create `app/api/drafts/[draftId]/route.ts` with `PUT` handler

3. Hook
   - [ ] Create `app/dashboard/_components/useEditDraft.ts`

4. New Components
   - [ ] Create `app/dashboard/_components/CopyButton.tsx`
   - [ ] Create `app/dashboard/_components/EditableTweetCard.tsx`

5. Display Component Updates
   - [ ] Modify `TwitterThreadDisplay.tsx` — add `draftId` prop, edit/copy UI and state
   - [ ] Modify `LinkedInPostDisplay.tsx` — add `draftId` prop, edit/copy UI and state

6. Wire Up Parent
   - [ ] Confirm `draftId` is forwarded from dashboard page state to both display components

7. Testing
   - [ ] Edit → Cancel → verify no API call and read-only content unchanged
   - [ ] Edit → Save → verify DB updated and panel reflects saved content
   - [ ] Edit → Revert → Save → verify original AI text is re-persisted
   - [ ] Copy (Twitter) → verify clipboard contains tweets joined by `\n\n`
   - [ ] Copy (LinkedIn) → verify clipboard contains full post
   - [ ] Editing Twitter draft does not mutate LinkedIn draft state

## Dependencies

- `shadcn/ui` Textarea (`npx shadcn@latest add textarea`)
- `navigator.clipboard` Web API (available in all modern browsers over HTTPS)
- Existing: `@prisma/client`, `lib/prisma.ts`, `components/ui/button`, `components/ui/card`, `components/ui/badge`

## Related Stories

- Story 03 — Generate Twitter Thread (provides `draftId` via SSE `done` event)
- Story 04 — Generate LinkedIn Post (provides `draftId` via SSE `done` event)
- Story 07 — Authentication (will replace `DEV_USER_ID` hardcoding; draft update route must use same placeholder for now)

## Notes

### Technical Considerations

1. **Content serialisation**: `Draft.content` is a JSON string. For Twitter, serialise as `JSON.stringify({ tweets: editedTweets })`; for LinkedIn, serialise as `JSON.stringify({ post: editedPost })`. Parse defensively with try/catch on read.
2. **Original snapshot**: Take the snapshot of `originalTweets` / `originalPost` inside the "Edit" click handler (not at component mount), so late-arriving SSE deltas after the draft is saved don't corrupt the snapshot.
3. **Optimistic UI**: Do not use optimistic updates — wait for the API to confirm success before exiting edit mode. The latency is acceptable for an MVP save action.
4. **`isSaving` guard**: Disable "Save", "Cancel", and individual textarea inputs while `isSaving === true` to prevent double-submits.
5. **Copy content source**: Copy always uses the last persisted content (from the stream or from a prior save) — not the in-flight edit state — to avoid confusing users who copy without saving.
6. **Per-tweet copy**: No per-tweet copy button for MVP. A single "Copy all" button in the card header is sufficient.

### Business Requirements

- Original AI-generated text must always be recoverable via "Revert to original" while the panel is mounted.
- Editing one format's draft must not affect other format drafts from the same job.
- "Simple edit + copy UI" is an explicit MVP requirement per the product brief.

### API Integration

#### Type Definitions

```typescript
// types/repurpose.ts — additions

// PUT /api/drafts/[draftId]
export interface UpdateDraftRequest {
  content: string; // serialised JSON string matching the format's content shape
}

export interface UpdateDraftResponse {
  draft: Draft;
}
```

#### Route Handler Sketch

```typescript
// app/api/drafts/[draftId]/route.ts
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ draftId: string }> }
): Promise<Response> {
  const { draftId } = await params;
  const body: unknown = await request.json();

  // Validate body
  if (
    typeof body !== 'object' ||
    body === null ||
    typeof (body as Record<string, unknown>).content !== 'string'
  ) {
    return Response.json({ error: 'Invalid request body', code: 'INVALID_BODY' }, { status: 400 });
  }

  const { content } = body as UpdateDraftRequest;

  const draft = await prisma.draft.update({
    where: { id: draftId },
    data: { content },
  });
  // Handle P2025 (record not found) → 404

  return Response.json({ draft } satisfies UpdateDraftResponse);
}
```

#### Mock Response

```json
{
  "draft": {
    "id": "clx1234567890",
    "userId": "dev-user-placeholder",
    "transcriptId": "clx0987654321",
    "format": "twitter_thread",
    "content": "{\"tweets\":[{\"index\":1,\"text\":\"Edited tweet text\"}]}",
    "createdAt": "2026-05-28T10:00:00.000Z",
    "updatedAt": "2026-05-28T10:05:00.000Z"
  }
}
```

### Testing Requirements

#### Integration Tests (manual for MVP)

```
1. Generate a Twitter thread → wait for completion
2. Click "Edit" → verify all tweet texts appear in textareas
3. Modify tweet 1 text → click "Cancel" → verify original text is shown
4. Click "Edit" again → modify tweet 1 text → click "Save"
   → verify API receives correct serialised JSON
   → verify panel shows updated text in read-only mode
5. Click "Edit" again → click "Revert to original"
   → verify textarea shows the original AI-generated text
6. Click "Copy" → paste into notepad → verify all tweets separated by blank lines
7. Repeat steps 2-6 for LinkedIn Post panel
8. Verify LinkedIn panel state is unchanged after Twitter save
```

#### Accessibility Checks

- All `<Textarea>` elements must have an `aria-label` describing their content (e.g., `"Edit tweet 1"`).
- "Save" button must have `aria-busy="true"` while `isSaving === true`.
- "Copy" button `aria-label` should update to `"Copied to clipboard"` during the flash period.

#### Performance Notes

- No debounce required — save is explicit (button click), not auto-save.
- Clipboard write is synchronous from the user's perspective; no loading state needed.
