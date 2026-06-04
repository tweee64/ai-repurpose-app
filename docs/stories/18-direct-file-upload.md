# User Story: 18 - Upload an Audio or Video File Directly for Transcription

**As a** content creator,
**I want** to upload an audio or video file directly from my computer,
**so that** I can transcribe and repurpose content that is not hosted on YouTube or another supported URL-based source.

## Acceptance Criteria

*   A file upload input is available on the ingestion form alongside the URL input.
*   Accepted file types include common audio formats (`.mp3`, `.m4a`, `.wav`, `.ogg`) and video formats (`.mp4`, `.mov`).
*   File size is capped at a defined maximum (e.g., 500 MB) with a clear error shown if exceeded.
*   The uploaded file is stored in temporary object storage (S3 / Cloudflare R2) and queued for Whisper transcription.
*   The job is tracked with the same status states as URL-based jobs (`pending`, `uploading`, `transcribing`, `completed`, `failed`).
*   Upload progress is shown to the user during the file transfer.
*   On successful transcription, the transcript is stored and available for repurposing.
*   The raw uploaded file is deleted from storage after transcription completes.
*   On failure (unsupported format, file too large, transcription error), a clear error message is shown.

## Notes

*   Unlike YouTube jobs, there is no `yt-dlp` extraction step — the file is uploaded directly to temporary storage before being sent to Whisper.
*   Multipart upload should be used for large files to avoid timeouts on slow connections.
*   This ingestion method broadens the app beyond YouTube-only content with minimal additional pipeline complexity.
