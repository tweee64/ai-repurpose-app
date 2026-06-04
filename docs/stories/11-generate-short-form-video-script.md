# User Story: 11 - Generate a Short-Form Video Script from a Transcript

**As a** content creator,
**I want** to generate a TikTok or Reels script from a transcript,
**so that** I can produce short-form video content quickly without writing a new script from scratch.

## Acceptance Criteria

*   A "Short-Form Script" output format option is available alongside other repurposing formats.
*   Triggering generation sends the transcript to the LLM with a short-form script-specific system prompt.
*   The generated script is structured for a 30–90 second video and includes: a hook (opening line), 3–5 punchy talking points, and a closing call-to-action.
*   The output is clearly labelled with approximate spoken duration based on word count.
*   The draft is streamed to the UI progressively as it is generated.
*   The completed draft is persisted in the database linked to the originating job.
*   The user can edit the draft inline and copy the full script to the clipboard.
*   On LLM failure, a clear error message is shown and the user can retry.

## Notes

*   The system prompt should emphasise punchy, conversational language and short sentences suitable for spoken delivery.
*   Duration estimate can be approximated at ~130 words per minute.
*   Future: allow the user to specify a target duration (30 s / 60 s / 90 s) which adjusts the prompt constraints.
