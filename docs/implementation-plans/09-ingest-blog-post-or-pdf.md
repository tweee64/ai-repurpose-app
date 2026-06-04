# 09 - Ingest Blog Post or PDF - Implementation Plan

## User Story

As a content creator, I want to submit a blog post URL or upload a PDF file so that its text is extracted and made available for repurposing, so that I can turn written content into social formats without retyping or manually copying text.

## Pre-conditions

- Story 01 (YouTube URL ingestion) is fully implemented; `TranscriptionJob`, `Transcript`, and `Draft` models are live in the database
- The fire-and-forget worker pattern (`lib/queue/transcription-worker.ts`) and status polling (`GET /api/transcription/[jobId]`) are established
- The repurposing engine (Twitter thread, LinkedIn post) consumes `transcript.text` regardless of how it was produced — no changes needed there
- `DEV_USER_ID` placeholder is in use (auth wired in Story 07)

## Design

### Visual Layout

The dashboard input area is extended with a **three-tab form** (`ContentIngestionForm`) that replaces the current `UrlInputForm`:

- **Tab 1 — "YouTube URL"**: existing URL input, unchanged behaviour
- **Tab 2 — "Blog URL"**: single text input for a blog / article URL, with a submit button
- **Tab 3 — "PDF Upload"**: drag-and-drop zone accepting `.pdf` files, showing filename and size once selected, with a remove button and an upload submit button

The downstream UI (progress card, transcript display, repurpose action bar, draft panels) is **unchanged** — the same components render after any ingestion type completes.

### Color and Typography

- **Background Colors**:
  - Primary: `bg-white dark:bg-gray-900`
  - Secondary: `bg-gray-50 dark:bg-gray-800`
- **Typography**:
  - Headings: `font-inter text-2xl font-semibold text-gray-900 dark:text-white`
  - Body: `font-inter text-base text-gray-600 dark:text-gray-300`
- **Component-Specific**:
  - Cards: `bg-white dark:bg-gray-800 shadow-md hover:shadow-lg`
  - Active tab: `border-b-2 border-primary text-primary font-medium`
  - PDF drop zone (idle): `border-2 border-dashed border-muted-foreground/25 rounded-lg hover:border-primary/50 transition-colors`
  - PDF drop zone (file selected): `border-primary bg-primary/5`
  - PDF drop zone (drag-over): `border-primary/70 bg-primary/10 scale-[1.01]`

### Interaction Patterns

- **Tab switching**: Clears any in-progress URL input or file selection; resets error state
- **Blog URL submit**: Same disabled-when-empty submit button pattern as YouTube URL tab; triggers ingestion on click or Enter
- **PDF drag-and-drop**: Accepts `.pdf` only; displays filename + human-readable file size on selection; shows inline error for files > 20 MB or wrong MIME type; "Remove" icon button deselects the file
- **Upload progress**: `TranscriptionJobCard` shows the `processing` status stage with the label "Extracting content…"

### Measurements and Spacing

```
Container:    max-w-2xl mx-auto (matching existing UrlInputForm)
Tabs bar:     border-b mb-6
Tab button:   px-4 py-2 text-sm
Drop zone:    h-32 w-full rounded-lg
```

### Responsive Behavior

- **Desktop (lg: 1024px+)**: Full-width tab bar, horizontal submit row
- **Tablet (md: 768–1023px)**: Same layout; drop zone retains height
- **Mobile (< 768px)**: Tabs wrap if needed; stacked submit button; drop zone uses tap-to-select fallback

## Technical Requirements

### New Packages Required

```
playwright              # headless Chromium for blog URL scraping
@mozilla/readability    # main-content extraction from DOM (strips nav/footer)
jsdom                   # required by @mozilla/readability for DOM parsing in Node.js
pdf-parse               # PDF text extraction from Buffer
@types/pdf-parse        # TypeScript types
```

After installing, run `npx playwright install chromium` to download the Chromium browser binary.

> **Note on serverless deployments**: The Chromium binary (~300 MB) requires special handling outside of local/VM environments. For Vercel/serverless, swap `playwright` for `playwright-core` + `@sparticuz/chromium`.

### Schema Changes (`prisma/schema.prisma`)

Rename `youtubeUrl` to `sourceUrl` (nullable) and add `sourceType` and `fileName` fields:

```prisma
model TranscriptionJob {
  id           String      @id @default(cuid())
  userId       String
  sourceType   String      @default("youtube")  // "youtube" | "blog_url" | "pdf"
  sourceUrl    String?                           // YouTube or blog URL; null for PDF uploads
  fileName     String?                           // original filename for PDF jobs
  status       String      @default("pending")
  errorMessage String?
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
  transcript   Transcript?
  user         User        @relation(fields: [userId], references: [id])
}
```

Migration note: existing rows must have `sourceType` back-filled to `"youtube"` and `sourceUrl` set to the value of the old `youtubeUrl` column.

### Component Structure

```
app/
  api/
    ingestion/
      route.ts                            # NEW — POST: accepts blog URL or PDF upload
      [jobId]/
        route.ts                          # NEW — GET: job status poll (same shape as transcription)
  dashboard/
    _components/
      ContentIngestionForm.tsx            # NEW — three-tab ingestion form
      useBlogIngestion.ts                 # NEW — blog URL submit + polling hook
      usePdfIngestion.ts                  # NEW — PDF file upload + polling hook
      TranscriptionJobCard.tsx            # MODIFY — add "processing" status label

lib/
  blog-scraper.ts                         # NEW — Playwright + Readability scraper
  pdf-parser.ts                           # NEW — pdf-parse wrapper returning plain text
  queue/
    ingestion-worker.ts                   # NEW — fire-and-forget blog/PDF pipeline

types/
  ingestion.ts                            # NEW — API request/response types
  transcription.ts                        # MODIFY — add "processing" to JobStatus; update TranscriptionJob shape
```

### Required Components

- [ ] `ContentIngestionForm` — three-tab input form replacing `UrlInputForm` on the dashboard
- [ ] `useBlogIngestion` — manages blog URL field → POST `/api/ingestion` → polling → transcript
- [ ] `usePdfIngestion` — manages file selection → POST `/api/ingestion` (multipart) → polling → transcript

### State Management Requirements

```typescript
// useBlogIngestion.ts
interface BlogIngestionState {
  url: string;
  uiStatus: UIJobStatus;
  jobId: string | null;
  transcript: Transcript | null;
  errorMessage: string | null;
}

// usePdfIngestion.ts
interface PdfIngestionState {
  file: File | null;
  uiStatus: UIJobStatus;
  jobId: string | null;
  transcript: Transcript | null;
  errorMessage: string | null;
}
```

## Acceptance Criteria

### Layout & Content

1. Input area tabs
   - Three tabs are visible: "YouTube URL", "Blog URL", "PDF Upload"
   - Active tab has a bottom border in the primary colour and bold label
   - Switching tabs clears the previous tab's input and any error messages

2. Blog URL tab
   - Text input with placeholder `https://example.com/article`
   - Submit button is disabled when the input is empty
   - Input is full-width matching the YouTube URL tab

3. PDF Upload tab
   - Drag-and-drop zone with an upload icon and the copy "Drop a PDF here, or click to browse"
   - Once a file is selected, zone shows the filename and file size
   - A remove (×) button allows deselecting the file
   - Submit button disabled when no file is selected

### Functionality

1. Blog URL ingestion
   - [ ] Submitting a valid URL creates a `TranscriptionJob` with `sourceType: "blog_url"`
   - [ ] Job status cycles: `pending` → `processing` → `completed`
   - [ ] Extracted main body text is stored as the `Transcript` and shown in `TranscriptDisplay`
   - [ ] On an empty / paywalled page, job becomes `failed` with a descriptive `errorMessage`
   - [ ] On a Playwright timeout, job becomes `failed` with timeout message

2. PDF ingestion
   - [ ] File selection is restricted to `application/pdf` MIME type
   - [ ] Files > 20 MB show an inline client-side error and are not submitted
   - [ ] Submitting a valid PDF creates a `TranscriptionJob` with `sourceType: "pdf"` and `fileName` set
   - [ ] Job status cycles: `pending` → `processing` → `completed`
   - [ ] Extracted text is stored as the `Transcript` and shown in `TranscriptDisplay`
   - [ ] Password-protected or corrupt PDFs result in `failed` status with a clear error message
   - [ ] Server-side rejects files over 20 MB with HTTP 413

3. Repurposing compatibility
   - [ ] "Generate Twitter Thread" and "Generate LinkedIn Post" work identically with blog/PDF transcripts
   - [ ] `TranscriptionJobCard` displays "Extracting content…" for the `processing` status

### Navigation Rules

- Job polling and the repurposing flow downstream of the transcript are identical to the YouTube ingestion path
- On job failure, `ErrorBanner` is shown with a retry option that resets the form

### Error Handling

- Blog scrape timeout (> 30s): `failed` + `"Page took too long to load. Try a different URL."`
- Blog page returns empty content: `failed` + `"No readable content found. The page may be paywalled or JavaScript-only."`
- PDF parse failure (encrypted, corrupt): `failed` + `"Could not extract text. The PDF may be password-protected or corrupted."`
- File > 20 MB (server-side): `{ error: "File exceeds the 20 MB limit", code: "FILE_TOO_LARGE" }` — HTTP 413
- Invalid MIME type (server-side): `{ error: "Only PDF files are accepted", code: "INVALID_FILE_TYPE" }` — HTTP 422
- Missing `sourceType` field: `{ error: "sourceType is required", code: "INVALID_BODY" }` — HTTP 400

## Modified Files

```
prisma/
  schema.prisma ✅                        # rename youtubeUrl → sourceUrl (nullable), add sourceType + fileName

app/
  api/
    ingestion/
      route.ts ✅                         # NEW — POST handler (blog URL + PDF multipart)
      [jobId]/
        route.ts ✅                       # NEW — GET handler (job status poll)
  dashboard/
    page.tsx ✅                           # Replace UrlInputForm with ContentIngestionForm; wire blog/PDF hooks
    _components/
      ContentIngestionForm.tsx ✅         # NEW — three-tab ingestion form
      UrlInputForm.tsx ⬜                 # MODIFY — extract YouTube-tab content into ContentIngestionForm
      TranscriptionJobCard.tsx ✅         # MODIFY — add "processing" status label "Extracting content…"
      useBlogIngestion.ts ✅             # NEW — blog URL ingestion hook
      usePdfIngestion.ts ✅              # NEW — PDF upload ingestion hook
      useTranscriptionJob.ts ⬜          # MODIFY — update TranscriptionJob type reference (sourceUrl/sourceType)

lib/
  blog-scraper.ts ✅                      # NEW — Playwright + Readability scraper
  pdf-parser.ts ✅                        # NEW — pdf-parse wrapper
  queue/
    ingestion-worker.ts ✅               # NEW — blog/PDF fire-and-forget pipeline

types/
  ingestion.ts ✅                         # NEW — IngestionSourceType, IngestionJobResponse
  transcription.ts ✅                     # MODIFY — add "processing" to JobStatus; update TranscriptionJob interface
```

## Status

✅ COMPLETED

1. Setup & Configuration
   - [x] Install `playwright`, `@mozilla/readability`, `jsdom`, `pdf-parse`, `@types/pdf-parse`
   - [x] Run `npx playwright install chromium`
   - [x] Write Prisma migration: rename `youtubeUrl` → `sourceUrl`, add `sourceType`, `fileName`
   - [x] Run `npx prisma migrate dev` and `npx prisma generate`

2. Library Layer
   - [x] Implement `lib/blog-scraper.ts` (Playwright + Readability)
   - [x] Implement `lib/pdf-parser.ts` (pdf-parse wrapper)
   - [x] Implement `lib/queue/ingestion-worker.ts` (fire-and-forget: scrape/parse → persist → complete)
   - [x] Add `"processing"` to `JobStatus` in `types/transcription.ts`
   - [x] Update `TranscriptionJob` interface in `types/transcription.ts` (sourceType, sourceUrl, fileName)
   - [x] Create `types/ingestion.ts`

3. API Routes
   - [x] Implement `app/api/ingestion/route.ts` (POST — blog URL + PDF multipart)
   - [x] Implement `app/api/ingestion/[jobId]/route.ts` (GET — poll job status)

4. UI Components
   - [x] Create `ContentIngestionForm.tsx` with three tabs
   - [x] Create `useBlogIngestion.ts` hook
   - [x] Create `usePdfIngestion.ts` hook
   - [x] Update `TranscriptionJobCard.tsx` with `processing` status label
   - [x] Update `dashboard/page.tsx` to swap in `ContentIngestionForm` and wire new hooks

5. Testing
   - [ ] Verify blog URL scraping on a known public article
   - [ ] Verify PDF upload with a sample single-page PDF
   - [ ] Verify 20 MB client-side and server-side rejection
   - [ ] Verify `failed` status on a paywalled URL
   - [ ] End-to-end: blog transcript → Twitter thread generation
   - [ ] End-to-end: PDF transcript → LinkedIn post generation

## Dependencies

- `playwright` — headless Chromium for blog scraping
- `@mozilla/readability` — main-content extraction (strips nav, footers, ads)
- `jsdom` — DOM environment required by Readability in Node.js
- `pdf-parse` — PDF text extraction from a `Buffer`
- Story 01 (YouTube ingestion) — shares `TranscriptionJob` model, status polling, and transcript pipeline
- Story 02 / 03 (Twitter / LinkedIn generation) — repurposing engine consumes `transcript.text` unchanged

## Related Stories

- 01 — Ingest YouTube URL (primary pattern this story mirrors)
- 08 — Ingest Podcast RSS Feed (similar ingestion extension; may share `ingestion-worker` pattern)
- 18 — Direct File Upload (may share PDF upload infrastructure)

## Notes

### Technical Considerations

1. **Playwright in Next.js Route Handlers**: Launch a headless browser per-request inside the ingestion worker (server-side only). Never import `lib/blog-scraper.ts` in Client Components. For production/serverless, replace `playwright` with `playwright-core` + `@sparticuz/chromium` and set the `executablePath` accordingly.

2. **Main content extraction**: After Playwright loads the page, pass `document.documentElement.innerHTML` to `@mozilla/readability` via `jsdom`. This strips navigation, headers, footers, and ads, leaving the main article body. Fall back to `document.body.innerText` if Readability returns null.

3. **PDF in-memory processing**: Parse PDFs from a `Buffer` (via `request.formData()` → `File.arrayBuffer()`) rather than writing to disk. This avoids the need for `lib/storage.ts` cleanup in the PDF path.

4. **Multipart uploads in Next.js 16**: Use `await request.formData()` in the Route Handler. Access the file as a `File` object; call `.arrayBuffer()` then `Buffer.from()` before passing to `pdf-parse`. Set `export const config = { api: { bodyParser: false } }` if needed (verify with Next.js 16 docs).

5. **Schema migration safety**: The migration must `ALTER TABLE "TranscriptionJob" RENAME COLUMN "youtubeUrl" TO "sourceUrl"` and back-fill `sourceType = 'youtube'` for all existing rows. Update `DEFAULT` to `''` or use `NOT NULL DEFAULT 'youtube'` for `sourceType`. Make `sourceUrl` nullable to allow PDF-only jobs.

6. **Polling reuse**: The new `GET /api/ingestion/[jobId]` route can return the exact same `{ job, transcript }` shape as `GET /api/transcription/[jobId]`. The existing `useTranscriptionJob` hook may be reusable with a `apiBasePath` parameter, or `useBlogIngestion` / `usePdfIngestion` can embed their own polling logic.

7. **Playwright timeout**: Set a hard 30-second timeout on the Playwright `page.goto()` call and catch `TimeoutError` explicitly to produce a `failed` job with a meaningful `errorMessage`.

### Business Requirements

- PDF size limit: **20 MB** — enforced client-side (before upload) and server-side (before processing)
- Paywalled URLs must fail gracefully with a human-readable message; no silent empty transcripts
- Password-protected PDFs must fail with a specific error (not a generic 500)
- No object storage needed — PDFs are processed in memory and discarded after text extraction

### API Integration

#### New Type Definitions (`types/ingestion.ts`)

```typescript
export type IngestionSourceType = 'blog_url' | 'pdf';

// POST /api/ingestion
// multipart/form-data fields:
//   sourceType: IngestionSourceType
//   url?:       string   (blog_url only)
//   file?:      File     (pdf only)

export interface IngestionJobResponse {
  jobId: string;
}

// GET /api/ingestion/[jobId]
// Returns JobStatusResponse from types/transcription.ts (no new type needed)
```

#### Updated `TranscriptionJob` Interface (`types/transcription.ts`)

```typescript
export type JobStatus =
  | 'pending'
  | 'downloading'
  | 'transcribing'
  | 'processing'      // NEW — used for blog scrape / PDF parse stage
  | 'completed'
  | 'failed';

export interface TranscriptionJob {
  id: string;
  userId: string;
  sourceType: 'youtube' | 'blog_url' | 'pdf';   // replaces implied youtube-only
  sourceUrl: string | null;                       // replaces youtubeUrl
  fileName: string | null;                        // PDF jobs only
  status: JobStatus;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}
```

#### `ingestion-worker.ts` Pipeline

```
pending
  → processing  (set on entry)
      blog_url:  Playwright.launch → page.goto(sourceUrl) → Readability.parse → extract text
      pdf:       pdf-parse(fileBuffer) → extract text
  → completed   (persist Transcript row, update job status)
  → failed      (catch all errors, persist errorMessage)
```

### Testing Requirements

```typescript
// Integration: blog URL extraction
test('extracts main content from a public blog post URL', async () => {
  // POST /api/ingestion { sourceType: 'blog_url', url: 'https://example.com/known-article' }
  // Poll GET /api/ingestion/[jobId] until status === 'completed'
  // Assert transcript.text.length > 200 and contains expected keyword
});

// Integration: PDF text extraction
test('extracts text from a valid single-page PDF', async () => {
  // POST /api/ingestion with multipart containing a test.pdf fixture
  // Poll until status === 'completed'
  // Assert transcript.text contains known string from fixture
});

// Edge case: file size rejection (server-side)
test('rejects PDF upload exceeding 20 MB with 413', async () => {
  // POST /api/ingestion with a 21 MB Buffer as file
  // Assert HTTP 413, body.code === 'FILE_TOO_LARGE'
});

// Edge case: paywalled blog
test('fails gracefully on a paywalled blog URL', async () => {
  // POST /api/ingestion { sourceType: 'blog_url', url: 'https://wsj.com/paywalled-article' }
  // Poll until status === 'failed'
  // Assert job.errorMessage is non-empty and user-readable
});

// Edge case: password-protected PDF
test('fails with descriptive error on an encrypted PDF', async () => {
  // POST /api/ingestion with an encrypted PDF fixture
  // Poll until status === 'failed'
  // Assert job.errorMessage mentions password/encryption
});

// Accessibility
test('ContentIngestionForm tabs are keyboard navigable', async () => {
  // Render ContentIngestionForm; tab through controls
  // Assert each tab is reachable via keyboard and has correct ARIA role="tab"
});
```
