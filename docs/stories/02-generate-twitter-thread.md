# User Story: 2 - Generate Twitter Thread from Transcript

**As a** content creator,
**I want** to generate a Twitter/X thread from my video transcript with a single click,
**so that** I can publish engaging, shareable thread content on X without spending time manually reformatting my ideas.

## Acceptance Criteria

*   A "Generate Twitter Thread" action is available once a transcript exists for a piece of content.
*   The app sends the transcript to Claude Sonnet using a dedicated Twitter thread system prompt.
*   The output is structured as a numbered sequence of tweets, each within the 280-character limit.
*   The first tweet acts as a hook designed to drive engagement.
*   The generated thread is displayed in the UI as individual tweet cards so the user can read it naturally.
*   The draft is saved to the database and associated with the source transcript and the user's account.
*   If the Claude API call fails, the user sees an error message and can retry without re-submitting the source content.

## Notes

*   The system prompt for this format must emphasise conciseness, hooks, and thread-native formatting (numbering, line breaks).
*   This is one of the two output formats required for MVP (alongside LinkedIn post).
*   Token cost per job at typical transcript lengths should fall within the $0.15–$0.40 range discussed.
