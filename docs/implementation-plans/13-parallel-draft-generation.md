# 13 - Parallel Draft Generation — Implementation Plan

## User Story

As a content creator, I want all selected output format drafts to generate in parallel rather than one after another, so that I see all my content options ready at roughly the same time without waiting for each format to complete sequentially.

## Pre-conditions

- Stories 2, 3, 12 (Twitter thread, LinkedIn post, Blog post generation) are fully implemented and streaming end-to-end. ✅
- Three independent hooks exist with their exact signatures: ✅
  - `useGenerateTwitterThread` → `{ generationStatus, partialTweets, tweets, draftId, errorMessage, generate, retry }`
  - `useGenerateLinkedInPost` → `{ generationStatus, streamingText, post, draftId, errorMessage, generate, retry }`
  - `useGenerateBlogPost` → `{ generationStatus, streamingText, post, draftId, errorMessage, generate, retry }`
- Three SSE streaming routes exist at: `/api/repurpose/twitter-thread/stream`, `/api/repurpose/linkedin-post/stream`, `/api/repurpose/blog-post/stream`. ✅
- Each hook manages its own `AbortController` ref; cleanup fires on unmount via `useEffect` return. ✅
- `GenerateActionsBar` current props: `{ transcriptId, generationStatus, onGenerate, linkedInGenerationStatus, onGenerateLinkedIn, blogPostGenerationStatus, onGenerateBlogPost }` — no `onGenerateAll` yet. ⬜
- `page.tsx` destructures all three hooks and passes props to `GenerateActionsBar` individually. ⬜ (needs `onGenerateAll` wiring)
- `GenerationStatus` type is `'idle' | 'generating' | 'streaming' | 'completed' | 'error'` in `types/repurpose.ts`. ✅
- `Badge` component exists at `components/ui/badge.tsx`. ✅
- `ErrorBanner` component exists for per-format error display. ✅

## Design

### Visual Layout

The dashboard's generation section gains two changes:
1. A **"Generate All Formats"** primary button added to `GenerateActionsBar` — positioned above (or before) the three individual buttons — that fires all three hooks simultaneously with a single click.
2. A **per-format status strip** below the action bar and above each draft display section, showing a small badge (`Idle | Generating… | Streaming… | Done | Failed`) for each of the three formats. This gives the user an at-a-glance overview of all three in-flight operations.

Individual draft display sections (`TwitterThreadDisplay`, `LinkedInPostDisplay`, `BlogPostDisplay`) remain unchanged; they each stream in independently as before. The existing `ErrorBanner` per section already handles inline errors and individual retry.

### Color and Typography

- **Background Colors**:
  - Primary: `bg-white dark:bg-gray-900`
  - Secondary: `bg-gray-50 dark:bg-gray-800`
- **Typography**:
  - Section labels: `text-sm font-medium text-gray-700 dark:text-gray-300`
  - Status badge text: `text-xs font-semibold`
- **Status Badge Colors** (via shadcn `Badge` variants):
  - `idle` → `secondary` variant (gray)
  - `generating` / `streaming` → `default` variant (blue) with spinner icon
  - `completed` → `outline` variant with green text (`text-green-600`)
  - `error` → `destructive` variant (red)

### Interaction Patterns

- **"Generate All" button**: Clicking fires all three `onGenerate` callbacks with the same `transcriptId` simultaneously. Button shows a spinner and becomes disabled while any format is still in progress. Label changes to "Regenerate All" once all three have completed.
- **Per-format status badges**: Update reactively from each hook's `generationStatus`. Each badge shows a spinner icon when `generating` or `streaming`.
- **Individual retry**: Each draft display section retains its own retry button (passed through from `GenerateActionsBar`). Clicking retry on a failed format does not affect the other formats.

### Measurements and Spacing

```
GenerateActionsBar container:  flex flex-col gap-3
"Generate All" button row:     w-full (full width, prominent)
Individual buttons row:        flex flex-wrap gap-2
Per-format status strip:       flex items-center gap-4 mt-2 text-sm
```

### Responsive Behavior

- **Desktop (lg: 1024px+)**: Status strip laid out horizontally — three badges side by side.
- **Tablet (md: 768px–1023px)**: Same horizontal layout; badges may wrap at narrow widths.
- **Mobile (< 768px)**: Status strip wraps to a vertical stack of badges.

## Technical Requirements

### Component Structure

```
app/dashboard/
├── page.tsx                                    # Add handleGenerateAll(); pass statuses to GenerateActionsBar; render GenerationStatusStrip
└── _components/
    ├── GenerateActionsBar.tsx                  # Add onGenerateAll prop + "Generate All" button
    ├── GenerationStatusStrip.tsx               # NEW — three Badge elements, one per format
    ├── useParallelGeneration.ts                # NEW — derives isAnyInProgress / isAllCompleted / hasAnyError
    ├── useGenerateTwitterThread.ts             # Unchanged ✅
    ├── useGenerateLinkedInPost.ts              # Unchanged ✅
    └── useGenerateBlogPost.ts                  # Unchanged ✅
```

### Required Components

- [ ] `GenerationStatusStrip.tsx` — three `Badge` components with spinner when `generating`/`streaming`, green when `completed`, red when `error`
- [ ] `useParallelGeneration.ts` — pure derivation hook; accepts the three `GenerationStatus` values; returns `{ isAnyInProgress, isAllCompleted, hasAnyError }`
- [ ] Updated `GenerateActionsBar.tsx` — new props `onGenerateAll` and `allGenerationStatus`; new primary "Generate All Formats" button above the three individual buttons

### State Management Requirements

```typescript
// useParallelGeneration.ts — no new state, pure derivation:
interface UseParallelGenerationArgs {
  twitterStatus: GenerationStatus;
  linkedinStatus: GenerationStatus;
  blogStatus: GenerationStatus;
}
interface UseParallelGenerationResult {
  isAnyInProgress: boolean;   // any status is 'generating' | 'streaming'
  isAllCompleted: boolean;    // all three are 'completed'
  hasAnyError: boolean;       // any status is 'error'
}

// Updated GenerateActionsBarProps (additions only — existing props unchanged):
interface GenerateActionsBarProps {
  // existing:
  transcriptId: string;
  generationStatus: GenerationStatus;         // twitter
  onGenerate: (transcriptId: string) => void;
  linkedInGenerationStatus: GenerationStatus;
  onGenerateLinkedIn: (transcriptId: string) => void;
  blogPostGenerationStatus: GenerationStatus;
  onGenerateBlogPost: (transcriptId: string) => void;
  // new:
  onGenerateAll: () => void;
  isAnyInProgress: boolean;   // from useParallelGeneration — controls "Generate All" disabled state
  isAllCompleted: boolean;    // from useParallelGeneration — controls "Regenerate All" label
}

// GenerationStatusStrip props:
interface GenerationStatusStripProps {
  twitter: GenerationStatus;
  linkedin: GenerationStatus;
  blog: GenerationStatus;
}
```

## Acceptance Criteria

### Layout & Content

1. **Generate All Button**
   - Visible in `GenerateActionsBar` whenever a transcript is available.
   - Shows "Generate All Formats" label in idle/post-completion state.
   - Shows spinner + "Generating…" label while any format is in progress.
   - Shows "Regenerate All" label once all three formats have completed at least once.

2. **Per-Format Status Strip**
   - Renders three badges labelled "Twitter Thread", "LinkedIn Post", "Blog Post".
   - Each badge reflects the real-time `generationStatus` from its corresponding hook.
   - Visible below `GenerateActionsBar` once any generation has been triggered.

### Functionality

1. **Simultaneous Trigger**
   - [ ] Clicking "Generate All Formats" calls all three generation functions within the same synchronous event handler tick (no awaiting between calls).
   - [ ] All three SSE connections are opened concurrently, evidenced by overlapping streaming in the UI.

2. **Independent Streaming**
   - [ ] Each draft section begins updating independently as tokens/tweets arrive on its own SSE stream.
   - [ ] A slow format does not delay the display of content from a faster format.

3. **Failure Isolation**
   - [ ] If one format's SSE stream returns an error event, only that format shows `ErrorBanner`; the other two formats continue streaming.
   - [ ] The "Generate All" button reflects overall in-progress state regardless of partial failure.

4. **Per-Format Retry**
   - [ ] Each `ErrorBanner` exposes a retry button scoped to its format.
   - [ ] Clicking retry on a failed format triggers only that format's generation hook and does not affect the other formats.

5. **Persistence**
   - [ ] Each format's draft is persisted to the database independently upon its individual stream completing (existing per-route behaviour — no change required).

6. **Button State**
   - [ ] "Generate All" is disabled while `isAnyInProgress` is true.
   - [ ] Individual format buttons remain independently operable (user can still trigger a single format).

### Error Handling

- If all three formats fail, all three `ErrorBanner`s display simultaneously; "Generate All" button returns to enabled state.
- Network errors (fetch failure before SSE connection) are surfaced per-format via the existing hook error path.
- Aborting the page/navigating away cleans up all three `AbortController`s via the hooks' existing cleanup `useEffect` returns.

## Modified Files

```
app/dashboard/
├── page.tsx                                    ⬜  add handleGenerateAll + useParallelGeneration wiring + GenerationStatusStrip render
└── _components/
    ├── GenerateActionsBar.tsx                  ⬜  add onGenerateAll prop, isAnyInProgress, isAllCompleted; add "Generate All" button
    ├── GenerationStatusStrip.tsx               ⬜  NEW FILE
    └── useParallelGeneration.ts                ⬜  NEW FILE
```

## Status

⬜ NOT STARTED

1. New Files
   - [ ] Create `app/dashboard/_components/useParallelGeneration.ts`
     - Accepts `{ twitterStatus, linkedinStatus, blogStatus }` as args
     - Returns `{ isAnyInProgress, isAllCompleted, hasAnyError }` via `useMemo`
   - [ ] Create `app/dashboard/_components/GenerationStatusStrip.tsx`
     - Renders three `Badge` elements: "Twitter Thread", "LinkedIn Post", "Blog Post"
     - Uses `secondary` variant for `idle`, `default` + `Loader2` spinner for `generating`/`streaming`, `outline` + `text-green-600` for `completed`, `destructive` for `error`
     - Only renders when at least one status is not `idle`

2. Update `GenerateActionsBar.tsx`
   - [ ] Add `onGenerateAll: () => void`, `isAnyInProgress: boolean`, `isAllCompleted: boolean` to props interface
   - [ ] Add "Generate All Formats" full-width `Button` above the three existing buttons
   - [ ] Button label: "Generate All Formats" (idle/first-run), "Generating…" + spinner (in-progress), "Regenerate All" (all completed)
   - [ ] Disable the button when `isAnyInProgress` is `true`

3. Update `app/dashboard/page.tsx`
   - [ ] Call `useParallelGeneration` with the three `generationStatus` values
   - [ ] Add `handleGenerateAll` synchronous handler: calls `generate(id)`, `generateLinkedIn(id)`, `generateBlogPost(id)` in the same tick (no `await`)
   - [ ] Pass `onGenerateAll`, `isAnyInProgress`, `isAllCompleted` to `GenerateActionsBar`
   - [ ] Render `<GenerationStatusStrip>` below `<GenerateActionsBar>`, inside the `isCompleted && activeTranscriptId` guard

4. Testing
   - [ ] Open Network tab — clicking "Generate All" must show three concurrent `POST` SSE requests
   - [ ] Verify status badges update independently as each stream progresses
   - [ ] Simulate failure: temporarily return an error from one stream endpoint; confirm the other two panels complete normally and the failed panel shows `ErrorBanner`
   - [ ] Verify per-format retry triggers only that format's hook

## Dependencies

- Stories 10, 11, 12: Twitter thread, LinkedIn post, and Blog post individual generation (must be merged first)
- `shadcn/ui` `Badge` component (`components/ui/badge.tsx` — add if not present via `npx shadcn@latest add badge`)
- `lucide-react` `Loader2` icon (already available via shadcn install)
- Existing streaming API routes (no backend changes required)

## Related Stories

- 10 (Twitter thread generation)
- 11 (LinkedIn post generation)
- 12 (Blog post generation)

## Notes

### Technical Considerations

1. **No backend changes required.** The three streaming routes are already independent HTTP endpoints. Firing three simultaneous `fetch` calls from the browser opens three concurrent SSE connections — `Promise.allSettled` is not needed on the backend, only on the frontend if a joined result is ever required (it is not for streaming).
2. **Isolation is already guaranteed.** Each hook holds its own `AbortController` ref. A failure in one hook's `fetch` call does not touch the other hooks' controllers.
3. **"Generate All" handler is synchronous.** The handler in `page.tsx` should call all three `onGenerate` functions synchronously (not with `await`) to ensure simultaneous dispatch:
   ```typescript
   const handleGenerateAll = () => {
     twitterThread.generate(transcriptId);
     linkedIn.generate(transcriptId);
     blogPost.generate(transcriptId);
   };
   ```
4. **Aggregate status derivation** in `useParallelGeneration` should be a pure function of three `GenerationStatus` values — no additional state needed:
   ```typescript
   const isAnyInProgress = [twitterStatus, linkedinStatus, blogStatus]
     .some(s => s === 'generating' || s === 'streaming');
   const isAllCompleted = [twitterStatus, linkedinStatus, blogStatus]
     .every(s => s === 'completed');
   ```
5. **`GenerationStatusStrip` render condition.** Show the strip only after the first `onGenerateAll` (or any individual generation) has been triggered — derive this from whether any status is not `'idle'`.

### Business Requirements

- All three draft formats should be available to the user at the soonest possible time.
- A partial failure must not degrade the experience for formats that succeeded.
- The UI must make it clear which formats are still loading vs. ready.

### API Integration

#### Type Definitions

```typescript
// No new API types required.
// Reuses existing types from types/repurpose.ts:

type GenerationStatus = 'idle' | 'generating' | 'streaming' | 'completed' | 'error';

// New props types (co-locate with their components):

interface GenerationStatusStripProps {
  twitter: GenerationStatus;
  linkedin: GenerationStatus;
  blog: GenerationStatus;
}

interface GenerateActionsBarProps {
  transcriptId: string;
  onGenerate: (transcriptId: string) => void;
  onGenerateLinkedIn: (transcriptId: string) => void;
  onGenerateBlogPost: (transcriptId: string) => void;
  onGenerateAll: () => void;                             // NEW
  twitterStatus: GenerationStatus;                       // NEW (for button label)
  linkedinStatus: GenerationStatus;                      // NEW
  blogStatus: GenerationStatus;                          // NEW
  allGenerationStatus: {                                 // NEW (for "Generate All" button)
    twitter: GenerationStatus;
    linkedin: GenerationStatus;
    blog: GenerationStatus;
  };
}
```

#### Mock Response (no new endpoints)

All three existing streaming routes return SSE events in the existing format:
```
event: tweet\ndata: {"type":"tweet","index":1,"text":"..."}\n\n
event: delta\ndata: {"type":"delta","text":"..."}\n\n
event: done\ndata: {"type":"done","draftId":"..."}\n\n
event: error\ndata: {"type":"error","message":"...","code":"..."}\n\n
```
