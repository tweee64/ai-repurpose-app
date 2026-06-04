# User Story: 3 - Generate LinkedIn Post from Transcript

**As a** content creator,
**I want** to generate a long-form LinkedIn post from my video transcript with a single click,
**so that** I can share professional insights with my LinkedIn audience without manually rewriting my content.

## Acceptance Criteria

*   A "Generate LinkedIn Post" action is available once a transcript exists for a piece of content.
*   The app sends the transcript to Claude Sonnet using a dedicated LinkedIn post system prompt.
*   The output is a single cohesive post written in a professional but conversational tone, appropriate for LinkedIn's format.
*   The post includes a strong opening line (hook), key insights from the source material, and a closing call-to-action or question to encourage engagement.
*   The generated post is displayed in the UI as a single text block.
*   The draft is saved to the database and associated with the source transcript and the user's account.
*   If the Claude API call fails, the user sees an error message and can retry without re-submitting the source content.

## Notes

*   The system prompt for this format must differ significantly from the Twitter thread prompt — LinkedIn rewards narrative depth and professional framing, not brevity.
*   This is one of the two output formats required for MVP (alongside Twitter thread).
*   Optimal LinkedIn post length is typically 900–1,300 characters; the prompt should target this range.
