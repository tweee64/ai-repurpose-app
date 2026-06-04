# User Story: 12 - Generate an SEO-Ready Blog Post from a Transcript

**As a** content creator,
**I want** to generate a long-form, SEO-ready blog post draft from a transcript,
**so that** I can publish written content to my website or blog without spending hours writing from scratch.

## Acceptance Criteria

*   A "Blog Post" output format option is available alongside other repurposing formats.
*   Triggering generation sends the transcript to the LLM with a blog-post-specific system prompt.
*   The generated post includes: an H1 title, an introduction paragraph, clearly structured H2/H3 sections, a conclusion, and a meta description suggestion.
*   The draft targets a natural, readable writing style with appropriate keyword usage based on the source content.
*   The draft is streamed to the UI progressively as it is generated.
*   The completed draft is persisted in the database linked to the originating job.
*   The user can edit the draft inline and copy the full content to the clipboard.
*   On LLM failure, a clear error message is shown and the user can retry.

## Notes

*   Blog posts will be significantly longer than other formats — streaming is especially important here to avoid a blank screen during generation.
*   The prompt should instruct the LLM to write in an active, first-person or brand-appropriate voice based on the source content.
*   Future: allow the user to specify a target word count or SEO keyword to optimise for.
