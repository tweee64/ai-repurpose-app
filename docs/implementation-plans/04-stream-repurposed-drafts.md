# 04 - Stream Repurposed Drafts - Implementation Plan

## User Story

As a content creator, I want to see my repurposed content drafts appear and populate progressively in real time as they are generated, so that I can start reading and evaluating content immediately rather than waiting for all formats to finish before seeing any results.

## Pre-conditions

- Story 02 (Twitter Thread generation) is complete — `/api/repurpose/twitter-thread` returns synchronous JSON
- Story 03 (LinkedIn Post generation) is complete — `/api/repurpose/linkedin-post` returns synchronous JSON
- `lib/claude.ts` contains `generateTwitterThread()` and `generateLinkedInPost()` using the `openai` SDK pointed at Groq
- `useGenerateTwitterThread.ts` and `useGenerateLinkedInPost.ts` use synchronous `fetch()` calls
- `TwitterThreadDisplay.tsx` and `LinkedInPostDisplay.tsx` render after the entire response arrives
- `GenerationStatus` type is `'idle' | 'generating' | 'completed' | 'error'`
- The `openai` npm package (v6+) is already installed and supports `stream: true`

## Design

### Visual Layout

The dashboard layout remains the same — two side-by-side (desktop) or stacked (mobile) content panels below the transcript. The change is in how each panel fills in:

**Loading → Streaming → Complete transition per panel:**

1. **Loading state** (same as today): Animated progress bar + "Drafting with Groq…" label
2. **Streaming state** (new): Progress bar collapses; raw content appears token-by-token inside the panel's scroll area, rendered as live-updating text
3. **Complete state** (same as today): Final structured content rendered (tweet cards / post text), character count shown, Copy button enabled

**Twitter Thread streaming behaviour:**
- Tweets appear one card at a time as each tweet JSON object is emitted as a complete SSE event
- A pulsing "..." indicator appears after the last completed tweet card while the next one is being generated
- Tweet cards use the existing `TweetCard` component; cards slide in with a subtle fade

**LinkedIn Post streaming behaviour:**
- Post text flows in character-by-character inside the existing `ScrollArea`
- A blinking cursor `▋` is appended to the partial text while streaming is in progress
- Character counter updates live as text accumulates

### Color and Typography

No changes to existing color tokens. New streaming indicators:
- **Typing cursor**: `text-muted-foreground animate-pulse` (Tailwind built-in)
- **Pending tweet placeholder**: `bg-muted/40 rounded-md h-16 animate-pulse` skeleton card

### Interaction Patterns

- **Generate button during streaming**: Disabled (spinner shown) until streaming completes for that format
- **Retry button**: Appears inline in the panel on stream error; clicking aborts any partial stream and restarts
- **Scroll during streaming**: Panel uses existing `ScrollArea`; partial content is never lost because it is accumulated in component state, not dependent on DOM position
- **Concurrent panels**: Both panels can stream simultaneously — each hook manages its own `AbortController`

### Measurements and Spacing

No layout changes from Stories 02–03. Existing spacing tokens are preserved:

```
Panel card:      same as today (p-4 md:p-6)
Tweet card gap:  space-y-3
```

### Responsive Behavior

- **Desktop (lg: 1024px+)**: Both panels side by side; both can stream simultaneously
- **Tablet (md: 768px–1023px)**: Stacked; same streaming behaviour
- **Mobile (< 768px)**: Stacked single-column; each panel streams independently

---

## Technical Requirements

### Streaming Architecture

```
Client hook (fetch + ReadableStream reader)
    │
    │  POST /api/repurpose/{format}/stream
    │  Accept: text/event-stream
    │
Next.js Route Handler (ReadableStream response)
    │
    │  openai SDK  stream: true  (Groq endpoint)
    │
Groq llama-3.3-70b-versatile
```

**SSE event protocol** (server → client):

| Event type | Payload | Meaning |
|---|---|---|
| `delta` | `{ text: string }` | Incremental token chunk |
| `tweet` | `{ index: number, text: string }` | Completed tweet (Twitter only) |
| `done` | `{ draftId: string }` | Stream finished, Draft saved in DB |
| `error` | `{ message: string, code: string }` | Fatal error during streaming |

**Twitter Thread strategy**: Prompt instructs the model to emit one tweet at a time using a delimiter (`---TWEET---`) between each tweet. The server-side stream handler buffers tokens until a delimiter is detected, then emits a `tweet` SSE event with the parsed `Tweet` object. This gives the client meaningful structural updates rather than raw JSON fragments.

**LinkedIn Post strategy**: Token deltas are forwarded directly to the client via `delta` events. The full accumulated text is saved as the Draft after the `[DONE]` signal from the Groq stream.

### Component Structure

```
app/
├── api/
│   └── repurpose/
│       ├── twitter-thread/
│       │   ├── route.ts                          # existing — keep for non-stream path
│       │   └── stream/
│       │       └── route.ts                      # NEW: SSE streaming endpoint
│       └── linkedin-post/
│           ├── route.ts                          # existing — keep for non-stream path
│           └── stream/
│               └── route.ts                      # NEW: SSE streaming endpoint
└── dashboard/
    └── _components/
        ├── TwitterThreadDisplay.tsx              # MODIFIED: streaming state rendering
        ├── LinkedInPostDisplay.tsx               # MODIFIED: streaming state rendering
        ├── useGenerateTwitterThread.ts           # MODIFIED: switch to streaming fetch
        └── useGenerateLinkedInPost.ts            # MODIFIED: switch to streaming fetch
lib/
└── claude.ts                                     # MODIFIED: add streamTwitterThread(), streamLinkedInPost()
types/
└── repurpose.ts                                  # MODIFIED: extend GenerationStatus + add stream types
```

### Required Components / Hooks

- [ ] `app/api/repurpose/twitter-thread/stream/route.ts` — streaming SSE route handler
- [ ] `app/api/repurpose/linkedin-post/stream/route.ts` — streaming SSE route handler
- [ ] `lib/claude.ts` — `streamTwitterThread()` and `streamLinkedInPost()` using `openai` SDK stream mode
- [ ] `useGenerateTwitterThread.ts` — update to consume SSE stream, accumulate tweet events
- [ ] `useGenerateLinkedInPost.ts` — update to consume SSE stream, accumulate delta events
- [ ] `TwitterThreadDisplay.tsx` — render partial tweet list + pending indicator during streaming
- [ ] `LinkedInPostDisplay.tsx` — render partial post text with blinking cursor during streaming

### State Management Requirements

```typescript
// types/repurpose.ts additions

type GenerationStatus = 'idle' | 'generating' | 'streaming' | 'completed' | 'error'

interface TwitterStreamState {
  generationStatus: GenerationStatus
  partialTweets: Tweet[]       // completed tweets received so far
  currentTweetText: string     // text being built for the in-progress tweet
  tweets: Tweet[]              // final tweet array (set on 'done')
  draftId: string | null
  errorMessage: string | null
}

interface LinkedInStreamState {
  generationStatus: GenerationStatus
  streamingText: string        // partial accumulated post text
  post: string | null          // final post text (set on 'done')
  draftId: string | null
  errorMessage: string | null
}

// SSE event shapes (client-side parsing)
interface SseDeltaEvent {
  type: 'delta'
  text: string
}

interface SseTweetEvent {
  type: 'tweet'
  index: number
  text: string
}

interface SseDoneEvent {
  type: 'done'
  draftId: string
}

interface SseErrorEvent {
  type: 'error'
  message: string
  code: string
}

type SseEvent = SseDeltaEvent | SseTweetEvent | SseDoneEvent | SseErrorEvent
```

---

## Acceptance Criteria

### Layout & Content

1. **Simultaneous panel display**
   - Both Twitter Thread and LinkedIn Post panels are visible from the moment generation is triggered
   - Each panel independently transitions through: loading → streaming → complete

2. **Streaming content visibility**
   - LinkedIn panel: post text flows in character-by-character within the `ScrollArea`; a blinking `▋` cursor is visible at the end of partial text
   - Twitter panel: completed tweet cards appear progressively; a skeleton card is shown below the last completed tweet while the next one is being generated

3. **Complete state**
   - Panels reach the same final rendered state as Stories 02–03 (tweet cards, character counter, etc.)
   - Blinking cursor and skeleton cards are removed on completion

### Functionality

1. **Token-by-token streaming**
   - [ ] LinkedIn post text updates in the UI within 100 ms of the first token arriving from Groq
   - [ ] Each Twitter tweet card renders as soon as its full text is received (not waiting for all tweets)

2. **Concurrent streaming**
   - [ ] Clicking "Generate Twitter Thread" and "Generate LinkedIn Post" in sequence initiates both streams concurrently
   - [ ] Both panels show streaming activity simultaneously; neither blocks the other
   - [ ] Each hook manages its own `AbortController` to avoid interference

3. **Stream lifecycle management**
   - [ ] `generationStatus` transitions: `idle → generating → streaming → completed`
   - [ ] On `done` SSE event, Draft is confirmed saved in DB and `draftId` is stored in state
   - [ ] Generate button is disabled (spinner shown) while a stream is active for that format

4. **Error handling**
   - [ ] If the stream errors mid-way, the panel shows `ErrorBanner` with a retry button
   - [ ] The error for one format does not affect the other format's panel
   - [ ] Retry aborts any residual stream and calls the streaming endpoint again from scratch
   - [ ] Network interruption (connection drop) triggers the error state with a generic message

5. **Slow connection resilience**
   - [ ] Partial content received before a connection drop is preserved in state (not cleared)
   - [ ] Scrolling the `ScrollArea` during active streaming does not cause content loss
   - [ ] No race condition between concurrent `AbortController` signals from retry and active stream

### Navigation Rules

- No navigation changes; streaming is contained within the existing dashboard page

### Error Handling

- Use per-panel inline `ErrorBanner` (already exists) — no global error for streaming failures
- Log server-side errors to `console.error`; return `event: error` SSE event to client — never expose raw stack traces
- `AbortController` cancellation (e.g., user navigates away) must not trigger the error state; distinguish `AbortError` from genuine failures
- If Groq returns a non-200 during streaming setup, respond with HTTP 500 before opening the stream

---

## Modified Files

```
app/api/repurpose/twitter-thread/stream/
└── route.ts                              ✅  NEW

app/api/repurpose/linkedin-post/stream/
└── route.ts                              ✅  NEW

lib/
└── claude.ts                             ✅  MODIFIED (add streaming fns)

types/
└── repurpose.ts                          ✅  MODIFIED (extend types)

app/dashboard/_components/
├── TwitterThreadDisplay.tsx              ✅  MODIFIED
├── LinkedInPostDisplay.tsx               ✅  MODIFIED
├── useGenerateTwitterThread.ts           ✅  MODIFIED
└── useGenerateLinkedInPost.ts            ✅  MODIFIED

app/dashboard/
└── page.tsx                              ✅  MODIFIED (pass new props)

app/dashboard/_components/
└── GenerateActionsBar.tsx                ✅  MODIFIED (streaming disables buttons)

components/ui/
└── skeleton.tsx                          ✅  NEW (via shadcn)
```

---

## Status

[x] COMPLETED

1. **Setup & Configuration**
   - [x] Extend `GenerationStatus` type in `types/repurpose.ts` to include `'streaming'`
   - [x] Add `SseEvent` union type and `TwitterStreamState` / `LinkedInStreamState` interfaces to `types/repurpose.ts`

2. **Backend — Streaming Route Handlers**
   - [x] Implement `lib/claude.ts` → `streamTwitterThread(transcriptText)` using `openai` SDK `stream: true` with tweet-delimiter prompt
   - [x] Implement `lib/claude.ts` → `streamLinkedInPost(transcriptText)` using `openai` SDK `stream: true`
   - [x] Create `app/api/repurpose/twitter-thread/stream/route.ts` — validate input, open stream, emit `tweet` / `done` / `error` SSE events, save Draft on completion
   - [x] Create `app/api/repurpose/linkedin-post/stream/route.ts` — validate input, open stream, emit `delta` / `done` / `error` SSE events, save Draft on completion

3. **Frontend — Streaming Hooks**
   - [x] Update `useGenerateTwitterThread.ts` to use `fetch()` + `ReadableStream` reader consuming `tweet` / `done` / `error` SSE events; manage `AbortController`
   - [x] Update `useGenerateLinkedInPost.ts` to use `fetch()` + `ReadableStream` reader consuming `delta` / `done` / `error` SSE events; manage `AbortController`

4. **Frontend — Component Updates**
   - [x] Update `TwitterThreadDisplay.tsx` to render `partialTweets` array during streaming + skeleton card for in-progress tweet
   - [x] Update `LinkedInPostDisplay.tsx` to render `streamingText` with blinking cursor during streaming

5. **Testing**
   - [ ] Verify Twitter Thread panel shows first tweet card before generation completes
   - [ ] Verify LinkedIn Post panel shows partial text within ~100 ms of first token
   - [ ] Verify both panels can stream concurrently (trigger both, observe both animate simultaneously)
   - [ ] Simulate network error mid-stream; verify per-panel error state and retry
   - [ ] Verify retry clears partial content and restarts the stream cleanly

---

## Dependencies

- `openai` npm package (v6+) — already installed; supports `stream: true` which returns an `AsyncIterable` of completion chunks
- No new npm packages required — `ReadableStream` and `TextEncoder` are native to the Node.js 18+ / Edge runtime used by Next.js App Router
- *(Optional enhancement)* `ai` (Vercel AI SDK) + `@ai-sdk/groq` — provides higher-level `streamText()` / `streamObject()` helpers and `useCompletion()` React hook; install with `npm install ai @ai-sdk/groq` if adopting the Vercel AI SDK path

---

## Related Stories

- 02 (Generate Twitter Thread — synchronous baseline being replaced with streaming)
- 03 (Generate LinkedIn Post — synchronous baseline being replaced with streaming)
- 05 (Edit Drafts — will depend on `draftId` state which this story must expose on completion)

---

## Notes

### Technical Considerations

1. **SSE vs WebSockets**: SSE (unidirectional, HTTP/1.1 compatible) is sufficient for server→client streaming of generation output. No need for WebSockets.

2. **ReadableStream in Next.js App Router**: Route handlers can return `new Response(readableStream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' } })`. The runtime keeps the connection open until the stream is closed.

3. **Twitter Thread tweet-delimiter prompt**: To emit structured events without complex incremental JSON parsing, change the Twitter Thread prompt to separate tweets with a known delimiter (e.g., `---TWEET---`). The server buffers tokens until a delimiter appears, then parses the buffered text as a tweet and emits a `tweet` SSE event. This is simpler and more robust than streaming partial JSON.

4. **Draft persistence timing**: The `done` SSE event should only be emitted after the Draft has been successfully written to the database. If DB write fails, emit `error` instead. This ensures `draftId` in client state corresponds to a real DB record.

5. **AbortController cleanup**: Both hooks must cancel their `AbortController` in a `useEffect` cleanup function to avoid memory leaks and state updates on unmounted components. Distinguish `AbortError` (user-initiated / unmount) from other errors — `AbortError` should silently reset to `idle`, not show an error banner.

6. **`generationStatus: 'generating'` vs `'streaming'`**: Use `'generating'` for the brief window between clicking Generate and receiving the first SSE byte (show animated progress bar). Transition to `'streaming'` on the first `delta` or `tweet` event (collapse progress bar, show live content).

7. **Groq streaming API**: The `openai` SDK with Groq base URL supports streaming via `client.chat.completions.create({ ..., stream: true })` which returns an `AsyncIterable<ChatCompletionChunk>`. Each chunk has `choices[0].delta.content` with the token string (or `null` on the final chunk).

### Business Requirements

- Real-time draft streaming is described in the product brief as "the magic moment" and primary value driver justifying subscription pricing — this story is highest priority after the MVP baseline
- Both formats must stream; partial availability (e.g., only LinkedIn streams) is not acceptable for release

### API Integration

#### New Streaming Endpoint Contracts

```typescript
// POST /api/repurpose/twitter-thread/stream
// Request body: { transcriptId: string }
// Response: Content-Type: text/event-stream
//
// SSE event stream:
//   event: tweet\ndata: {"type":"tweet","index":1,"text":"..."}\n\n
//   event: tweet\ndata: {"type":"tweet","index":2,"text":"..."}\n\n
//   ...
//   event: done\ndata: {"type":"done","draftId":"clxxxxx"}\n\n
//
// On error:
//   event: error\ndata: {"type":"error","message":"...","code":"GENERATION_FAILED"}\n\n

// POST /api/repurpose/linkedin-post/stream
// Request body: { transcriptId: string }
// Response: Content-Type: text/event-stream
//
// SSE event stream:
//   event: delta\ndata: {"type":"delta","text":"As a content creator"}\n\n
//   event: delta\ndata: {"type":"delta","text":", the most..."}\n\n
//   ...
//   event: done\ndata: {"type":"done","draftId":"clxxxxx"}\n\n
//
// On error:
//   event: error\ndata: {"type":"error","message":"...","code":"GENERATION_FAILED"}\n\n
```

#### Updated Type Definitions

```typescript
// types/repurpose.ts

type GenerationStatus = 'idle' | 'generating' | 'streaming' | 'completed' | 'error'

interface SseDeltaEvent {
  type: 'delta'
  text: string
}

interface SseTweetEvent {
  type: 'tweet'
  index: number
  text: string
}

interface SseDoneEvent {
  type: 'done'
  draftId: string
}

interface SseErrorEvent {
  type: 'error'
  message: string
  code: string
}

type SseEvent = SseDeltaEvent | SseTweetEvent | SseDoneEvent | SseErrorEvent
```

### Testing Requirements

#### Integration Tests

```typescript
// Verify first tweet arrives before stream completes
test('twitter thread: first tweet renders before stream ends', async () => {
  // trigger generation, observe that at least one TweetCard renders
  // before the done event fires
})

// Verify concurrent streaming
test('both panels stream simultaneously', async () => {
  // trigger both Generate buttons in sequence
  // assert both panels show 'streaming' generationStatus at the same time
})

// Verify per-panel error isolation
test('linkedin error does not affect twitter panel', async () => {
  // mock linkedin stream to error at 50% completion
  // assert twitter panel continues to streaming → completed
  // assert linkedin panel shows ErrorBanner with retry button
})
```

#### Performance

- First token latency (time from Generate click to first character visible): target < 500 ms on a standard broadband connection
- Groq streaming typically delivers the first token within 100–200 ms

#### Accessibility

- Streaming panels must include `aria-live="polite"` on the content region so screen readers announce content updates
- The blinking cursor element should be `aria-hidden="true"` to avoid noisy screen reader announcements
- Progress bar during `'generating'` state already has `role="status"` and `aria-live="polite"` — ensure this is preserved
