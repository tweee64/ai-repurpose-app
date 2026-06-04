# 03 — Generate LinkedIn Post - Implementation Plan

## User Story

As a content creator, I want to generate a long-form LinkedIn post from my video transcript with a single click, so that I can share professional insights with my LinkedIn audience without manually rewriting my content.

## Pre-conditions

- Story 01 (Transcription pipeline) is complete — a `Transcript` record exists and a `transcriptId` is available in the dashboard UI.
- Story 02 (Twitter thread generation) is complete — the `GenerateActionsBar` component and the `useGenerateTwitterThread` hook pattern are established and can be mirrored.
- `DraftFormat = 'twitter_thread' | 'linkedin_post'` is already defined in `types/repurpose.ts`.
- The `Draft` Prisma model already supports `linkedin_post` as a `format` value — no schema migration is needed.
- The LinkedIn Post `Button` in `GenerateActionsBar` is already rendered but disabled — it just needs to be wired up.
- `GROQ_API_KEY` is configured in the environment.

## Design

### Visual Layout

The dashboard page gains a new `LinkedInPostDisplay` card that appears below the existing `TwitterThreadDisplay` card (or in place of it if only LinkedIn is generated). The card structure mirrors `TwitterThreadDisplay` with a LinkedIn icon in the header, but displays a single text block instead of a list of tweet cards.

```
┌────────────────────────────────────────┐
│ [LinkedIn icon]  LinkedIn Post         │   ← CardHeader with icon + title
│────────────────────────────────────────│
│  [Post body — single prose block]      │   ← CardContent with ScrollArea
│                                        │
│  Character count: NNN / 1300           │   ← Subtle char counter bottom-right
└────────────────────────────────────────┘
```

Loading state: pulsing progress bar + "Drafting your post with Groq…" (matches Twitter thread loading pattern).

Error state: reuses `ErrorBanner` component with retry handler.

### Color and Typography

- **Background Colors**:
  - Card: `bg-white dark:bg-gray-800 shadow-md`
  - Post text: `bg-background`
- **Typography**:
  - Card title: `font-semibold text-foreground` (inherits from `CardTitle`)
  - Post body: `text-sm leading-relaxed text-foreground whitespace-pre-wrap`
  - Char counter: `text-xs text-muted-foreground` (warning amber when approaching 1300)

### Interaction Patterns

- **Generate button**: Click triggers `useGenerateLinkedInPost.generate(transcriptId)`. Button label switches to "Regenerate Post" after first generation (matches Twitter thread button behavior in `GenerateActionsBar`).
- **Loading**: Card shows indeterminate progress bar and aria live region while `generationStatus === 'generating'`.
- **Error**: `ErrorBanner` renders with a "Try again" button calling `retry(transcriptId)`.
- **Completed**: Post text is displayed inside a `ScrollArea`. Character count is shown.

### Measurements and Spacing

```
Card padding:       CardContent default (p-6)
ScrollArea height:  max-h-[60vh] sm:max-h-[40vh] md:max-h-[60vh]
Char counter:       text-right mt-2
```

### Responsive Behavior

- **Desktop (lg: 1024px+)**: Full-width card within the `max-w-3xl` dashboard column.
- **Tablet (md: 768px–1023px)**: Same single-column layout.
- **Mobile (< 768px)**: Same; `ScrollArea` height collapses to `max-h-[60vh]`.

## Technical Requirements

### Component Structure

```
app/
├── api/
│   └── repurpose/
│       └── linkedin-post/
│           └── route.ts                      # NEW — POST handler
├── dashboard/
│   └── _components/
│       ├── GenerateActionsBar.tsx            # MODIFIED — enable LinkedIn button
│       ├── LinkedInPostDisplay.tsx           # NEW — display component
│       └── useGenerateLinkedInPost.ts        # NEW — client hook
│   └── page.tsx                             # MODIFIED — wire up hook + display
lib/
│   └── claude.ts                            # MODIFIED — add generateLinkedInPost()
types/
│   └── repurpose.ts                         # MODIFIED — add LinkedIn API types
```

### Required Components

- [ ] `LinkedInPostDisplay` — Card component rendering the generated post text, loading state, and error state
- [ ] `useGenerateLinkedInPost` — Client hook mirroring `useGenerateTwitterThread`, calling `POST /api/repurpose/linkedin-post`
- [ ] `generateLinkedInPost` (lib function) — Groq LLM call with LinkedIn-specific system prompt
- [ ] `POST /api/repurpose/linkedin-post` — Route handler: validate input → fetch transcript → generate → persist draft → return

### State Management Requirements

```typescript
// useGenerateLinkedInPost.ts
interface UseGenerateLinkedInPostState {
  generationStatus: GenerationStatus;  // 'idle' | 'generating' | 'completed' | 'error'
  post: string | null;                 // The generated post body text
  draftId: string | null;
  errorMessage: string | null;
  generate: (transcriptId: string) => Promise<void>;
  retry: (transcriptId: string) => void;
}
```

## Acceptance Criteria

### Layout & Content

1. Generate Actions Bar
   - The "LinkedIn Post" button is enabled (not `disabled`) once a `transcriptId` is available.
   - Button shows a LinkedIn icon and label "LinkedIn Post" before first generation, "Regenerate Post" after.
   - Button is disabled and shows spinner while `generationStatus === 'generating'`.

2. LinkedIn Post Display Card
   - Appears in the dashboard below the URL form stack when `generationStatus !== 'idle'`.
   - Header shows a LinkedIn icon and the title "LinkedIn Post".
   - Body renders the post text in a `ScrollArea` as a single whitespace-preserved prose block.
   - A character count (`NNN / 1300`) is shown below the post body, styled as `text-muted-foreground`.

### Functionality

1. Generation Flow
   - [ ] Clicking "LinkedIn Post" calls `POST /api/repurpose/linkedin-post` with `{ transcriptId }`.
   - [ ] While awaiting the response, `generationStatus` is `'generating'` and the card shows a loading state.
   - [ ] On success, `generationStatus` transitions to `'completed'` and the post body is displayed.
   - [ ] The `Draft` record is persisted to the database with `format: 'linkedin_post'` and `content: JSON.stringify({ post })`.
   - [ ] Clicking "Regenerate Post" repeats the generation call and replaces the previous output.

2. Character Count
   - [ ] Character count reflects the length of the generated post text.
   - [ ] Count text turns amber (`text-amber-500`) when the count is between 1200 and 1300 characters.
   - [ ] Count text turns red (`text-destructive`) when the count exceeds 1300 characters.

3. Error Handling
   - [ ] If the API call fails (network error or non-2xx response), `generationStatus` is `'error'` and `ErrorBanner` renders with the server error message.
   - [ ] Clicking "Try again" in `ErrorBanner` calls `retry(transcriptId)`, which re-runs `generate`.
   - [ ] If the Groq API call fails inside the route handler, a `500` is returned with `{ error, code: 'GENERATION_ERROR' }`.
   - [ ] If the LLM output cannot be parsed, a `500` is returned with `{ error, code: 'PARSE_ERROR' }`.
   - [ ] API errors do not expose stack traces or raw Groq error messages to the client.

### Navigation Rules

- No page navigation is triggered by generation; everything happens in-place on the dashboard.

### Error Handling

- Client-side errors use `ErrorBanner` with a retry callback — same pattern as Twitter thread.
- Server-side errors are logged with `console.error` and return a generic message to the client.
- `PrismaClientKnownRequestError` (P2002 unique constraint) is caught and returns a `500` with `code: 'INTERNAL_ERROR'`.

## Modified Files

```
app/
├── api/
│   └── repurpose/
│       └── linkedin-post/
│           └── route.ts                      ✅ NEW
├── dashboard/
│   └── _components/
│       ├── GenerateActionsBar.tsx            ✅ MODIFIED
│       ├── LinkedInPostDisplay.tsx           ✅ NEW
│       └── useGenerateLinkedInPost.ts        ✅ NEW
│   └── page.tsx                             ✅ MODIFIED
lib/
│   └── claude.ts                            ✅ MODIFIED
types/
│   └── repurpose.ts                         ✅ MODIFIED
```

## Status

[x] COMPLETED

1. Setup & Type Definitions
   - [x] Add `LinkedInPostContent`, `GenerateLinkedInPostRequest`, `GenerateLinkedInPostResponse` to `types/repurpose.ts`

2. LLM Integration
   - [x] Add `LINKEDIN_POST_SYSTEM_PROMPT` constant to `lib/claude.ts`
   - [x] Add `generateLinkedInPost(transcriptText: string): Promise<string>` to `lib/claude.ts`

3. API Route
   - [x] Create `app/api/repurpose/linkedin-post/route.ts` — input validation, transcript lookup, LLM call, draft persistence

4. Client Hook
   - [x] Create `useGenerateLinkedInPost.ts` mirroring `useGenerateTwitterThread.ts`

5. UI Components
   - [x] Create `LinkedInPostDisplay.tsx` — loading, error, and completed states
   - [x] Modify `GenerateActionsBar.tsx` — add `linkedInGenerationStatus`, `onGenerateLinkedIn` props; enable button
   - [x] Modify `app/dashboard/page.tsx` — instantiate `useGenerateLinkedInPost`, pass props to `GenerateActionsBar`, render `LinkedInPostDisplay`

6. Testing
   - [ ] Verify end-to-end flow: submit URL → transcript → click LinkedIn Post → post displayed
   - [ ] Verify error state renders `ErrorBanner` with retry
   - [ ] Verify draft saved to DB with `format: 'linkedin_post'`
   - [ ] Verify character count colour transitions at 1200 and 1300

## Dependencies

- `GROQ_API_KEY` environment variable (already required)
- `openai` npm package (already installed — used for Groq API)
- `@prisma/client` + singleton from `lib/prisma.ts` (already installed)
- shadcn/ui components already installed: `Card`, `Button`, `Badge`, `ScrollArea`
- Story 01 (transcription pipeline) must be completed before this feature is usable

## Related Stories

- Story 01 — YouTube transcription pipeline (prerequisite)
- Story 02 — Twitter thread generation (provides the architecture pattern to mirror)
- Story 07 — User authentication (DEV_USER_ID placeholder used until auth is wired)

## Notes

### Technical Considerations

1. **LLM Output Format**: The Twitter thread route parses a JSON object `{ tweets: [...] }`. For LinkedIn, the LLM should return `{ "post": "..." }` — a single string. The system prompt must explicitly enforce this to avoid freeform responses.
2. **Prompt Design**: The LinkedIn prompt must differ significantly from the Twitter prompt. Key differences: no character limit per item, narrative/professional tone, targets ~900–1300 characters, includes a hook, key insights, and a closing CTA or question.
3. **Content Field**: The `Draft.content` column stores a JSON string. For LinkedIn, it will store `JSON.stringify({ post: "..." })` — consistent with the existing pattern.
4. **Singleton LLM Client**: `lib/claude.ts` already uses a lazy-initialized `client` singleton. The new `generateLinkedInPost` function reuses the same `getClient()` helper — no second instance.
5. **DEV_USER_ID Placeholder**: The route handler uses `'dev-user-placeholder'` as `userId` (same as the Twitter thread route) until Story 07 (auth) is implemented.
6. **No Schema Migration**: The existing `Draft` schema already stores `format` as a freeform `String` and accepts `'linkedin_post'` — no `prisma migrate` is needed for this story.

### Business Requirements

- Post length target: 900–1300 characters — enforced by the system prompt, validated visually by the character counter.
- Professional but conversational tone — must differ from Twitter thread (brevity-first) and read as a narrative.
- Must include: strong opening hook, key insights from the transcript, closing CTA or engagement question.

### API Integration

#### New Type Definitions (`types/repurpose.ts`)

```typescript
export interface LinkedInPostContent {
  post: string;
}

// POST /api/repurpose/linkedin-post
export interface GenerateLinkedInPostRequest {
  transcriptId: string;
}

export interface GenerateLinkedInPostResponse {
  draft: Draft;
  post: string;
}
```

#### Request / Response Shape

```
POST /api/repurpose/linkedin-post
Content-Type: application/json

Request body:
{ "transcriptId": "<uuid>" }

Success (200):
{
  "draft": { "id": "...", "userId": "...", "transcriptId": "...", "format": "linkedin_post", "content": "{\"post\":\"...\"}", "createdAt": "...", "updatedAt": "..." },
  "post": "The full LinkedIn post text as a plain string."
}

Error (400):
{ "error": "transcriptId is required", "code": "INVALID_REQUEST" }

Error (404):
{ "error": "Transcript not found", "code": "TRANSCRIPT_NOT_FOUND" }

Error (500):
{ "error": "Failed to generate LinkedIn post. Please try again.", "code": "GENERATION_ERROR" }
{ "error": "Failed to parse post output", "code": "PARSE_ERROR" }
{ "error": "Failed to save draft. Please try again.", "code": "INTERNAL_ERROR" }
```

#### System Prompt Design (`lib/claude.ts`)

```typescript
const LINKEDIN_POST_SYSTEM_PROMPT = `You are an expert LinkedIn content strategist.

Transform the provided transcript into a single high-engagement LinkedIn post.

Rules:
- Return ONLY a valid JSON object. Do not include any explanation, markdown, or prose outside the JSON.
- The JSON must have this exact shape: { "post": "..." }
- The post must be between 900 and 1300 characters.
- Begin with a strong opening line (hook) that grabs attention in the LinkedIn feed.
- Follow with 3–5 key insights or takeaways from the transcript, written in narrative prose.
- End with a closing question or call-to-action that encourages comments or engagement.
- Write in a professional but conversational first-person tone appropriate for LinkedIn.
- Use line breaks between sections for readability.
- Do NOT use bullet points or numbered lists — write in flowing paragraphs.`;
```

### Testing Requirements

#### Integration Tests (manual / browser)

```
Scenario: Successful LinkedIn post generation
  Given a completed transcription job with a transcript
  When the user clicks "LinkedIn Post"
  Then a loading card appears with a progress bar
  And the API call resolves successfully
  And the card updates to show the generated post text
  And a Draft record exists in the DB with format "linkedin_post"

Scenario: API error during generation
  Given a completed transcription job with a transcript
  When the user clicks "LinkedIn Post" and the API returns 500
  Then an ErrorBanner is shown with the error message
  And a "Try again" button is present
  When the user clicks "Try again"
  Then the generation is re-attempted

Scenario: Character count indicator
  Given a generated post of 1250 characters
  Then the counter shows "1250 / 1300" in amber
  Given a generated post of 1350 characters
  Then the counter shows "1350 / 1300" in red (destructive)
```

#### Accessibility

- Loading card must have `role="status"` and `aria-live="polite"` on the progress region.
- The post `ScrollArea` must have `aria-label="LinkedIn post text"` and `tabIndex={0}`.
- The "LinkedIn Post" button must have a descriptive `aria-label` when in loading state.
