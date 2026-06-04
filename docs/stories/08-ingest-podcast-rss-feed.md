# User Story: 8 - Ingest a Podcast / RSS Feed Episode for Transcription

**As a** content creator,
**I want** to submit a podcast RSS feed URL and select an episode to transcribe,
**so that** I can repurpose podcast content without manually downloading audio files.

## Acceptance Criteria

*   An RSS feed URL input is accepted alongside the existing YouTube URL input.
*   The app fetches and parses the RSS feed, displaying a list of available episodes (title, date, duration).
*   The user selects a single episode to process.
*   The app downloads the episode audio using the feed's `enclosure` URL and queues it for Whisper transcription.
*   The job is tracked in the same `TranscriptionJob` pipeline as YouTube jobs, with the same status states (`pending`, `downloading`, `transcribing`, `completed`, `failed`).
*   The user sees a progress indicator during processing.
*   On failure (invalid feed URL, inaccessible audio file, transcription error), a clear error message is shown.
*   The raw audio file is deleted from temporary storage after transcription completes.

## Notes

*   RSS parsing should handle both RSS 2.0 and Atom feed formats.
*   Episode list should be paginated or capped (e.g., most recent 20 episodes) to avoid overwhelming the UI.
*   Post-MVP: allow bulk-queuing multiple episodes in one submission.
