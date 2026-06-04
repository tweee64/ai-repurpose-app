# User Story: 7 - Create an Account and Sign In

**As a** content creator,
**I want** to create an account and sign in securely,
**so that** my transcripts, generated drafts, and job history are private and accessible only to me across sessions.

## Acceptance Criteria

*   A user can register with an email address and password.
*   A user can sign in with their registered credentials.
*   Passwords are stored hashed and are never retrievable in plain text.
*   Authenticated sessions are maintained via a secure, HTTP-only cookie or JWT token.
*   Unauthenticated users who attempt to access protected pages (dashboard, history) are redirected to the sign-in page.
*   A user can sign out, which invalidates their session.
*   Basic input validation is applied to the registration form (e.g., valid email format, minimum password length).

## Notes

*   NextAuth.js or Clerk are the recommended implementation options; Clerk reduces custom auth code significantly.
*   OAuth (Google, GitHub) sign-in can be added post-MVP but is not required to launch.
*   All user data in PostgreSQL must be scoped by `user_id` to enforce data isolation between accounts.
