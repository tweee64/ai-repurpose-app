# User Story: 15 - Connect a Social Media Account for Publishing

**As a** content creator,
**I want** to connect my X (Twitter), LinkedIn, or other social media accounts to the app via OAuth,
**so that** I can publish or schedule drafts directly from the app without manually logging into each platform.

## Acceptance Criteria

*   A "Connected Accounts" settings section is accessible from the user's account area.
*   The user can initiate an OAuth connection flow for supported platforms (at minimum: X/Twitter and LinkedIn via Buffer OAuth).
*   After completing the OAuth flow, the connected account (platform name and display handle) is shown as connected in the settings page.
*   The user can disconnect an account at any time, which revokes the stored token and removes the connection.
*   Connected accounts are scoped to the user — each user manages their own connections.
*   If a stored token expires or is revoked externally, the app shows a "reconnect" prompt rather than silently failing.
*   OAuth tokens are stored securely server-side and never exposed to the client.

## Notes

*   Using Buffer's OAuth simplifies this significantly — one Buffer connection covers multiple platforms rather than implementing each platform's OAuth separately.
*   If going direct (no Buffer), X API v2 and LinkedIn API each require separate OAuth 2.0 flows with different scopes.
*   This story is a prerequisite for Story 14 (Schedule a Draft for Publishing).
