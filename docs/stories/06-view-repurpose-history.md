# User Story: 6 - View Past Repurpose Jobs and Drafts

**As a** content creator,
**I want** to view a history of my past repurpose jobs and access their saved drafts,
**so that** I can revisit, reuse, or continue editing content I generated in previous sessions.

## Acceptance Criteria

*   A "History" or "Past Jobs" section is accessible from the main navigation.
*   The history list shows each repurpose job with its source title (or YouTube URL), date created, and the output formats generated.
*   Clicking a job opens a detail view showing all saved drafts (in their last edited state) for that job.
*   Jobs are sorted by most recent first by default.
*   The history list is scoped to the authenticated user — users cannot see each other's jobs.
*   Drafts retrieved from history support the same edit and copy functionality as newly generated drafts (see Story 5).

## Notes

*   Draft and job data is stored in PostgreSQL; transcripts and raw assets are stored in S3/R2.
*   Pagination or infinite scroll should be considered if a user accumulates many jobs, but is not required for MVP.
*   This story covers read and edit access only — no delete functionality is required for MVP.
