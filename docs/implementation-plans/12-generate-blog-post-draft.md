# 12 - Generate Blog Post Draft - Implementation Plan

## User Story

As a content creator, I want to generate a long-form, SEO-ready blog post draft from a transcript, so that I can publish written content to my website or blog without spending hours writing from scratch.

## Pre-conditions

- A `Transcript` record must exist in the database (created by the ingestion pipeline).
- The `Draft` model in `prisma/schema.prisma` already stores format as a plain `String` — no schema migration is needed; `'blog_post'` is a new valid value.
- The existing streaming infrastructure (SSE via `ReadableStream`, `AbortController`, delta events) is in place and proven by the LinkedIn post feature.
- `useEditDraft` hook and `CopyButton` component are already implemented and reusable.
- `react-markdown` is **not** currently installed — it must be added as a dependency to render heading structure (H1/H2/H3) in the blog post display.

## Design

### Visual Layout

The blog post panel appears below `GenerateActionsBar`, alongside `TwitterThreadDisplay` and `LinkedInPostDisplay`. It is wrapped in a `Card` component consistent with the other display panels.

**States:**
1. **`idle`** — Component renders nothing (`return null`)
2. **`generating`** — Indeterminate progress bar + "Drafting Blog Post…" title
3. **`streaming`** — Incrementally rendered markdown content inside a `ScrollArea`; content grows as delta tokens arrive
4. **`completed`** — Full blog post rendered as markdown; header shows Copy + Edit buttons
5. **`error`** — `ErrorBanner` component with retry button

**Edit mode:** The rendered markdown view is replaced with a `Textarea` pre-filled with the raw markdown. A "Save" button and a "Cancel" button appear in the card header.

### Color and Typography

- **Background Colors**:
  - Card: `bg-white dark:bg-gray-900`
  - Streaming placeholder: `bg-muted`
- **Typography**:
  - Card title: `font-semibold` with a document/pen icon (Lucide `FileText`)
  - Rendered body: standard prose sizing via `react-markdown` with Tailwind prose utilities
  - Character/word count hint: `text-xs text-muted-foreground`
- **Streaming cursor**: Blinking `|` appended to streaming text (CSS `animate-pulse`)

### Interaction Patterns

- **Generate button**: Disabled and shows spinner while `generationStatus` is `'generating'` or `'streaming'`; label changes to "Regenerate Blog Post" after first completion
- **Edit mode toggle**: Click "Edit" → textarea appears with current content; "Cancel" reverts; "Save" calls `useEditDraft` PUT endpoint
- **Copy button**: `CopyButton` component copies the current post content to clipboard
- **Retry on error**: `ErrorBanner` with `onRetry` callback re-triggers generation

### Measurements and Spacing

```
Card:           Same as LinkedInPostDisplay — full-width within max-w-3xl container
ScrollArea:     h-[500px] during streaming/completed view
Textarea:       h-[500px] in edit mode, font-mono text-sm
Card header:    flex justify-between items-center border-b
Action buttons: gap-2 flex items-center
```

### Responsive Behavior

- **Desktop (lg: 1024px+)**: Full-width card within the `max-w-3xl` content column
- **Tablet / Mobile**: Same single-column layout; `ScrollArea` height unchanged; buttons stack on very small screens with `flex-wrap`

## Technical Requirements

### Component Structure

```
app/
  api/
    repurpose/
      blog-post/
        route.ts                         ⬜  Non-streaming POST endpoint
        stream/
          route.ts                       ⬜  SSE streaming POST endpoint
  dashboard/
    _components/
      BlogPostDisplay.tsx                ⬜  Display + edit + copy component
      useGenerateBlogPost.ts             ⬜  Custom hook (SSE streaming + state)
      GenerateActionsBar.tsx             ⬜  Add "Blog Post" button
    page.tsx                             ⬜  Wire useGenerateBlogPost + BlogPostDisplay
lib/
  claude.ts                              ⬜  Add generateBlogPost() + streamBlogPost()
types/
  repurpose.ts                           ⬜  Add BlogPost types + 'blog_post' to DraftFormat
```

### Required Components

- [ ] `BlogPostDisplay` — Card-based display with streaming, view, edit, and error states
- [ ] `useGenerateBlogPost` — Hook managing SSE stream, state transitions, and abort control
- [ ] Updated `GenerateActionsBar` — Third button for "Blog Post" generation
- [ ] `generateBlogPost()` in `lib/claude.ts` — Non-streaming LLM call
- [ ] `streamBlogPost()` in `lib/claude.ts` — Token-streaming LLM call

### State Management Requirements

```typescript
// useGenerateBlogPost.ts return shape
interface UseGenerateBlogPostState {
  generationStatus: GenerationStatus;   // 'idle' | 'generating' | 'streaming' | 'completed' | 'error'
  streamingText: string;                // accumulates delta tokens during streaming
  post: string | null;                  // finalised post content (markdown string)
  draftId: string | null;              // DB Draft.id once persisted
  errorMessage: string | null;
  generate: (transcriptId: string) => void;
  retry: (transcriptId: string) => void;
}

// BlogPostDisplay props
interface BlogPostDisplayProps {
  generationStatus: GenerationStatus;
  streamingText: string;
  post: string | null;
  errorMessage: string | null;
  transcriptId: string;
  draftId: string | null;
  onRetry: (transcriptId: string) => void;
}
```

### Content Shape (DB Storage)

The blog post is stored in `Draft.content` as a JSON string, consistent with the LinkedIn post pattern:

```json
{ "post": "# Title\n\n> **Meta description:** ...\n\n## Introduction\n\n..." }
```

`Draft.format` is set to `'blog_post'`.

### LLM Prompt Strategy

**Streaming system prompt** (raw markdown output — no JSON wrapper):

```
You are an expert blog writer and SEO strategist.

Transform the provided transcript into a long-form, SEO-ready blog post.

Rules:
- Output ONLY the blog post content — no preamble, no code fences, no JSON.
- Begin with a single H1 heading (# Title) that is compelling and keyword-rich.
- On the very next line, output the meta description in this exact format:
  > Meta description: [one sentence, 150–160 characters, keyword-rich]
- Follow with an engaging introduction paragraph (2–3 sentences).
- Include 3–6 H2 sections (## Heading) with body paragraphs under each.
  - Use H3 (### Sub-heading) where sub-sections add clarity.
- End with a ## Conclusion section summarising key takeaways.
- Write in a natural, active, first-person voice based on the source content.
- Use short paragraphs (2–4 sentences each) for readability.
- Target 600–1200 words total.
```

**Non-streaming system prompt** (JSON wrapper, consistent with existing pattern):

Same as above but prefixed with:
```
Return ONLY a valid JSON object with this exact shape: { "post": "..." }
where the value is the full blog post in Markdown, including the # title and > meta description line.
```

### `lib/claude.ts` Additions

```typescript
export async function generateBlogPost(transcriptText: string): Promise<string>
export async function streamBlogPost(
  transcriptText: string,
  onToken: (token: string) => void,
  signal?: AbortSignal,
): Promise<void>
```

`streamBlogPost` follows the identical pattern as `streamLinkedInPost` (raw token callback, `max_tokens: 4096`).

### SSE Event Protocol (blog post stream)

Reuses the same delta-event pattern as LinkedIn post streaming:

```
event: delta
data: {"type":"delta","text":"# How to..."}

event: delta
data: {"type":"delta","text":"\n\n> Meta description:"}

event: done
data: {"type":"done","draftId":"clxxx..."}

event: error
data: {"type":"error","message":"...","code":"GENERATION_ERROR"}
```

### `react-markdown` Integration

`react-markdown` must be installed to render heading hierarchy and prose structure:

```bash
npm install react-markdown
```

Use it in `BlogPostDisplay` with a minimal component map:

```tsx
import ReactMarkdown from 'react-markdown';
// Render inside ScrollArea when generationStatus === 'completed'
<ReactMarkdown
  components={{
    h1: ({ children }) => <h1 className="text-2xl font-bold mt-0 mb-3">{children}</h1>,
    h2: ({ children }) => <h2 className="text-lg font-semibold mt-6 mb-2">{children}</h2>,
    h3: ({ children }) => <h3 className="text-base font-medium mt-4 mb-1">{children}</h3>,
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-primary pl-4 text-muted-foreground text-sm my-3">
        {children}
      </blockquote>
    ),
    p: ({ children }) => <p className="mb-3 leading-relaxed">{children}</p>,
  }}
>
  {post}
</ReactMarkdown>
```

During **streaming**, use `whitespace-pre-wrap` on a `<p>` tag (no markdown parsing) for performance — only switch to `ReactMarkdown` on `completed`.

## Acceptance Criteria

### Layout & Content

1. **Blog Post button in GenerateActionsBar**
   - A "Blog Post" button appears alongside Twitter Thread and LinkedIn Post buttons
   - Button is disabled and shows a spinner + "Generating…" label while `generationStatus` is `'generating'` or `'streaming'`
   - Button label changes to "Regenerate Blog Post" after a successful generation

2. **BlogPostDisplay card**
   - Card renders nothing when `generationStatus === 'idle'`
   - Card shows an indeterminate progress bar and "Drafting Blog Post…" title during `'generating'`
   - Generated content includes an H1 title, a blockquote meta description, an intro paragraph, H2/H3 sections, and a conclusion

### Functionality

1. **Streaming**
   - [ ] Content appears incrementally in the UI as delta tokens arrive from the SSE stream
   - [ ] `AbortController` cancels any in-flight stream when a new generation is triggered
   - [ ] `generationStatus` transitions: `idle → generating → streaming → completed`

2. **Persistence**
   - [ ] A `Draft` record is created in the DB with `format: 'blog_post'` and `content: JSON.stringify({ post: fullMarkdownText })`
   - [ ] `draftId` is returned in the `done` SSE event and stored in hook state

3. **Editing**
   - [ ] Clicking "Edit" replaces the rendered markdown view with a `Textarea` pre-filled with the raw markdown string
   - [ ] "Save" calls `PUT /api/drafts/[draftId]` via `useEditDraft`; on success, updates `post` state and exits edit mode
   - [ ] "Cancel" discards changes and reverts to the last saved content
   - [ ] `isSaving` disables the Save button and shows a spinner during the PUT request

4. **Copy**
   - [ ] `CopyButton` copies the current post content (raw markdown) to clipboard
   - [ ] Available in both view and edit modes (copies the current `post` value, not the unsaved `editedPost`)

5. **Error handling**
   - [ ] Network error or non-200 response sets `generationStatus: 'error'` and shows `ErrorBanner`
   - [ ] `ErrorBanner` displays a human-readable message and a "Retry" button
   - [ ] Retry calls `generate(transcriptId)` again, resetting state and restarting the stream

### Navigation Rules

- `BlogPostDisplay` is rendered unconditionally when a `transcriptId` is available (same as `TwitterThreadDisplay` and `LinkedInPostDisplay`); it self-hides when `generationStatus === 'idle'`

### Error Handling

- All API route handlers return `{ error: string; code: string }` on 4xx/5xx
- `TRANSCRIPT_NOT_FOUND` (404) when the provided `transcriptId` does not exist
- `INVALID_REQUEST` (400) when `transcriptId` is missing or not a string
- `GENERATION_ERROR` (SSE error event) when the Groq API call fails
- LLM errors are logged server-side; client receives only generic messages

## Modified Files

```
app/
  api/
    repurpose/
      blog-post/
        route.ts                         ✅  NEW
        stream/
          route.ts                       ✅  NEW
  dashboard/
    _components/
      BlogPostDisplay.tsx                ✅  NEW
      useGenerateBlogPost.ts             ✅  NEW
      GenerateActionsBar.tsx             ✅  MODIFY — add blog post button + props
    page.tsx                             ✅  MODIFY — wire hook and display component
lib/
  claude.ts                              ✅  MODIFY — add generateBlogPost, streamBlogPost
types/
  repurpose.ts                           ✅  MODIFY — add 'blog_post' to DraftFormat, new types
```

## Status

[x] COMPLETED

1. **Setup & Configuration**
   - [x] Install `react-markdown` (`npm install react-markdown`)
   - [x] Add `'blog_post'` to `DraftFormat` union in `types/repurpose.ts`
   - [x] Add `BlogPostContent`, `GenerateBlogPostRequest`, `GenerateBlogPostResponse`, `BlogPostStreamState` to `types/repurpose.ts`

2. **LLM Layer**
   - [x] Add `BLOG_POST_SYSTEM_PROMPT` and `BLOG_POST_STREAM_SYSTEM_PROMPT` constants to `lib/claude.ts`
   - [x] Implement `generateBlogPost(transcriptText)` — non-streaming, returns raw markdown string (JSON-wrapped from LLM)
   - [x] Implement `streamBlogPost(transcriptText, onToken, signal?)` — mirrors `streamLinkedInPost`, `max_tokens: 4096`

3. **API Routes**
   - [x] Create `app/api/repurpose/blog-post/route.ts` — POST, non-streaming, same structure as `linkedin-post/route.ts`
   - [x] Create `app/api/repurpose/blog-post/stream/route.ts` — POST, SSE streaming, same structure as `linkedin-post/stream/route.ts`; persists `Draft` with `format: 'blog_post'`

4. **Client Hook**
   - [x] Create `app/dashboard/_components/useGenerateBlogPost.ts` — mirrors `useGenerateLinkedInPost.ts`; calls `/api/repurpose/blog-post/stream`; parses `delta` and `done` events

5. **UI Components**
   - [x] Create `app/dashboard/_components/BlogPostDisplay.tsx` — mirrors `LinkedInPostDisplay.tsx`; uses `ReactMarkdown` for completed view; `whitespace-pre-wrap` during streaming
   - [x] Update `GenerateActionsBar.tsx` — add `blogPostGenerationStatus` + `onGenerateBlogPost` props; add third button
   - [x] Update `app/dashboard/page.tsx` — import `useGenerateBlogPost`, `BlogPostDisplay`; pass new props to `GenerateActionsBar`; render `BlogPostDisplay`

6. **Testing**
   - [ ] Verify SSE stream delivers delta tokens and `done` event in browser DevTools Network tab
   - [ ] Verify `Draft` row created in DB with `format = 'blog_post'` (Prisma Studio)
   - [ ] Verify edit flow: load draft → edit textarea → save → content updates in UI
   - [ ] Verify copy-to-clipboard copies correct markdown
   - [ ] Verify retry button clears error and restarts stream

## Dependencies

| Dependency | Version | Purpose |
|---|---|---|
| `react-markdown` | `^9.x` | Render markdown heading hierarchy in `BlogPostDisplay` |
| `groq` (via `openai` SDK) | existing | LLM streaming and non-streaming calls |
| `useEditDraft` | existing hook | Reuse for save-draft PUT request |
| `CopyButton` | existing component | Reuse for clipboard copy |
| `ErrorBanner` | existing component | Reuse for error + retry display |

> **No Prisma migration required.** The `Draft.format` column is `String` — `'blog_post'` is a new accepted value, no DB schema change needed.

## Notes

### Technical Considerations

- **Token budget**: Blog posts (600–1200 words ≈ 800–1600 tokens) fit within Groq's rate limits. Use `max_tokens: 4096` for the streaming call to allow headroom for verbose outputs.
- **Streaming vs. parsing**: Unlike Twitter threads (delimiter-parsed) and LinkedIn posts (pure token stream stored directly), blog posts follow the same "pure token stream" approach as LinkedIn. No per-section parsing is needed.
- **`react-markdown` bundle size**: Only used client-side in `BlogPostDisplay`. Next.js code-splits this automatically. No SSR concerns.
- **Markdown in Textarea**: The edit `Textarea` shows raw markdown (e.g., `# Title`, `## Heading`). This is intentional — content creators editing markdown is an acceptable UX for this MVP.
- **Meta description extraction**: The LLM is prompted to include the meta description as a `> Meta description: ...` blockquote. In the rendered view, this appears as a styled blockquote. No further parsing is needed.
- **`DEV_USER_ID`** placeholder: Both new API routes should use the same `const DEV_USER_ID = 'dev-user-placeholder'` pattern consistent with existing routes (see Story 07 TODO comment).

### Business Requirements

- Blog posts are significantly longer than other formats — streaming is essential to avoid a perceived "blank screen" during generation.
- The LLM should write in an active, natural voice. The system prompt instructs first-person writing style derived from the source content.
- Future enhancement (out of scope): allow user to specify a target word count or a primary SEO keyword to optimise for (noted in story).

### API Shape Summary

```typescript
// POST /api/repurpose/blog-post
// Request
{ transcriptId: string }
// Response (200)
{ draft: Draft; post: string }

// POST /api/repurpose/blog-post/stream
// Request
{ transcriptId: string }
// Response: text/event-stream
// Events: delta → done | error
```

### New Types to Add to `types/repurpose.ts`

```typescript
// Add 'blog_post' to the existing union:
export type DraftFormat = 'twitter_thread' | 'linkedin_post' | 'blog_post';

export interface BlogPostContent {
  post: string; // full blog post in Markdown
}

export interface GenerateBlogPostRequest {
  transcriptId: string;
}

export interface GenerateBlogPostResponse {
  draft: Draft;
  post: string;
}

export interface BlogPostStreamState {
  generationStatus: GenerationStatus;
  streamingText: string;
  post: string | null;
  draftId: string | null;
  errorMessage: string | null;
}
```

## Testing Requirements

### Integration Tests

```typescript
// app/api/repurpose/blog-post/stream/route.test.ts (sketch)
describe('POST /api/repurpose/blog-post/stream', () => {
  it('returns 400 when transcriptId is missing');
  it('returns 404 SSE error event when transcript does not exist');
  it('streams delta events and a done event for a valid transcript');
  it('persists a Draft record with format blog_post after streaming');
});
```

### Performance

- First visible token should appear within 2 seconds of clicking "Blog Post" (Groq TTFT SLA)
- Full 800-word post should complete streaming within 15 seconds

### Accessibility

- `BlogPostDisplay` card uses `role="status"` with `aria-live="polite"` on the streaming container (matching LinkedIn pattern)
- "Edit" and "Save" buttons have descriptive `aria-label` attributes
- `ScrollArea` includes `tabIndex={0}` for keyboard navigation
- `CopyButton` preserves its existing `aria-label="Copy to clipboard"` behaviour
