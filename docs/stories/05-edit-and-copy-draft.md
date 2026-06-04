# User Story: 5 - Edit and Copy a Generated Draft

**As a** content creator,
**I want** to edit a generated draft inline and copy the final version to my clipboard,
**so that** I can make quick adjustments before publishing without leaving the app or switching to another editor.

## Acceptance Criteria

*   Each generated draft panel has an "Edit" mode that converts the read-only text into an editable text area.
*   Changes made in edit mode are auto-saved or saved on an explicit "Save" action and persisted to the database.
*   A "Copy" button copies the full draft text to the clipboard with a single click.
*   A visible confirmation (e.g., "Copied!") appears briefly after the copy action succeeds.
*   The user can switch between the original AI-generated version and their edited version.
*   Editing one format's draft does not affect other format drafts from the same job.

## Notes

*   This is the core post-generation interaction for MVP — no publishing integration is in scope yet.
*   "Simple edit + copy UI" is explicitly listed as an MVP requirement in the product brief.
*   The original AI-generated text should always be preserved so users can revert if needed.
