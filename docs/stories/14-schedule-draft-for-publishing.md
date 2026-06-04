# User Story: 14 - Schedule a Draft for Future Publishing

**As a** content creator,
**I want** to schedule a generated draft to be published at a specific date and time via Buffer,
**so that** I can queue content in advance without having to manually post it when the time comes.

## Acceptance Criteria

*   A "Schedule" action is available on each completed draft alongside the existing "Copy" action.
*   The user can pick a publish date and time using a date/time picker.
*   Submitting the schedule sends the draft content and schedule time to the Buffer API for the appropriate platform (X, LinkedIn, etc.).
*   A success confirmation is shown once Buffer confirms the post has been queued.
*   The draft's status in the app is updated to reflect that it has been scheduled (e.g., "Scheduled for [date]").
*   If the Buffer API call fails, a clear error message is shown and the draft remains unscheduled.
*   Scheduling requires the user to have a connected social account (depends on Story 15).

## Notes

*   Buffer supports most major platforms (X/Twitter, LinkedIn, Instagram, etc.) and handles OAuth in one integration rather than multiple separate platform APIs.
*   The app stores the Buffer `post_id` against the draft so scheduled/published status can be queried later.
*   Future: show scheduled posts in a calendar or queue view within the app.
