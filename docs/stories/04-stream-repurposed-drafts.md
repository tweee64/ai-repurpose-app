# User Story: 4 - See Drafts Stream in Real Time

**As a** content creator,
**I want** to see my repurposed content drafts appear and populate progressively in real time as they are generated,
**so that** I can start reading and evaluating content immediately rather than waiting for all formats to finish before seeing any results.

## Acceptance Criteria

*   When a repurpose job is triggered, all requested output format panels are displayed simultaneously in the UI in a loading state.
*   Each panel streams its content token-by-token as the corresponding Claude call produces output, using server-sent events or a streaming HTTP response.
*   Multiple output format panels stream concurrently (parallel Claude calls), not sequentially.
*   A panel transitions from loading to complete state automatically once its Claude call finishes.
*   If one format's Claude call fails mid-stream, that panel shows an inline error and a retry button without affecting other panels.
*   Streaming works correctly on slow connections; partial content is not lost if the user scrolls during generation.

## Notes

*   The Vercel AI SDK on the Next.js frontend and FastAPI's `StreamingResponse` on the backend are the intended implementation path.
*   The "magic moment" described in the product brief — drafts populating in real time — is the core experience that justifies the subscription price. This story is high priority.
*   Langfuse tracing should capture start/end timestamps per streaming call to measure latency.
