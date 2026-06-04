# User Story: 13 - Generate All Drafts Simultaneously Across Formats

**As a** content creator,
**I want** all selected output format drafts to generate in parallel rather than one after another,
**so that** I see all my content options ready at roughly the same time without waiting for each format to complete sequentially.

## Acceptance Criteria

*   When a user triggers repurposing for multiple formats, all LLM calls are fired simultaneously (not queued sequentially).
*   Each format's draft section in the UI begins streaming independently as its own response arrives.
*   A per-format progress indicator shows which drafts are still generating and which are complete.
*   A format that fails does not block or cancel other in-flight generations.
*   Failed formats show an inline error with a per-format retry button.
*   All completed drafts are persisted to the database once their individual streams finish.

## Notes

*   This story is a performance and UX refinement that improves the core repurposing flow. It depends on the individual format generation stories (10, 11, 12, etc.) being implemented first.
*   The backend should use `Promise.allSettled` (or equivalent) to fire parallel LLM calls and handle partial failures gracefully.
*   The Vercel AI SDK's `useChat` / streaming primitives support multiple concurrent streams on the frontend.
