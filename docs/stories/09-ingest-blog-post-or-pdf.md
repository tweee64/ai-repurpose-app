# User Story: 9 - Ingest a Blog Post or PDF for Repurposing

**As a** content creator,
**I want** to submit a blog post URL or upload a PDF file so that its text is extracted and made available for repurposing,
**so that** I can turn written content into social formats without retyping or manually copying text.

## Acceptance Criteria

*   The ingestion form accepts either a public URL (blog post) or a PDF file upload as input.
*   For blog URLs, the app uses a headless browser (Playwright) to fetch and extract the main body text, handling JavaScript-rendered pages.
*   For PDF uploads, the app extracts text content from the file using a PDF parsing library.
*   The extracted text is stored as the job's transcript and made available to the repurposing engine.
*   The job is tracked with the same status states as other ingestion types (`pending`, `processing`, `completed`, `failed`).
*   The user sees a progress indicator during extraction.
*   On failure (paywalled URL, password-protected PDF, parsing error), a clear error message is shown.
*   PDF uploads are limited to a reasonable file size (e.g., 20 MB) with a clear error if exceeded.

## Notes

*   Unlike audio jobs, there is no Whisper transcription step — text extraction feeds directly into the repurposing engine.
*   Paywalled or login-gated pages may fail silently (content not accessible); the error message should guide the user.
*   For MVP consideration: blog URL scraping and PDF upload can be scoped as two separate stories if complexity warrants it.
