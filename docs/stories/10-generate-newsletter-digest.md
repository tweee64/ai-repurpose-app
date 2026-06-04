# User Story: 10 - Generate a Newsletter Digest from a Transcript

**As a** content creator,
**I want** to generate a newsletter digest from a transcript,
**so that** I can share a summarised, readable version of my content directly to my email subscribers without writing it from scratch.

## Acceptance Criteria

*   A "Newsletter Digest" output format option is available alongside Twitter Thread and LinkedIn Post.
*   Triggering generation sends the transcript to the LLM with a newsletter-specific system prompt.
*   The generated digest includes: a subject line suggestion, an introduction paragraph, 3–5 key takeaway sections with headers, and a closing call-to-action.
*   The draft is streamed to the UI progressively as it is generated.
*   The completed draft is persisted in the database linked to the originating job.
*   The user can edit the draft inline and copy the full content to the clipboard.
*   On LLM failure, a clear error message is shown and the user can retry generation.

## Notes

*   The newsletter prompt should target a digest/summary tone — not a verbatim transcript summary, but an edited, reader-friendly format.
*   Subject line suggestion is a nice-to-have and can be surfaced as a separate field or as the first line of the output.
*   Future: integrate with email providers (e.g., Beehiiv, ConvertKit) for one-click sending or drafting.
