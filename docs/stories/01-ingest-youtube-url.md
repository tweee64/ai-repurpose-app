# User Story: 1 - Ingest YouTube URL for Transcription

**As a** content creator,
**I want** to submit a YouTube video URL and have the app automatically extract and transcribe its audio,
**so that** I have a clean text transcript that can be repurposed into other content formats without manual effort.

## Acceptance Criteria

*   A URL input field is available on the main dashboard.
*   The app validates that the submitted URL is a recognisable YouTube link before processing.
*   The app uses `yt-dlp` to extract audio from the YouTube video in the background.
*   The extracted audio is sent to the OpenAI Whisper API for transcription.
*   The user sees a loading/progress indicator while ingestion and transcription are running.
*   On success, the generated transcript is displayed to the user and stored in the database linked to their account.
*   On failure (invalid URL, private/unavailable video, Whisper error), a clear error message is shown and no job is persisted.
*   Transcription jobs are processed via an async task queue so that the web request does not time out on long videos.

## Notes

*   MVP scope: YouTube URL is the only ingestion method. Podcast/RSS, Blog/PDF, and direct upload are post-MVP.
*   Average transcription latency for a 30-minute video should be communicated to the user via a progress state.
*   The raw audio file should be deleted from temporary storage after transcription succeeds to control storage costs.
