# 07 User Account Authentication - Implementation Plan

## User Story

As a content creator, I want to create an account and sign in securely, so that my transcripts, generated drafts, and job history are private and accessible only to me across sessions.

## Pre-conditions

- PostgreSQL database is running and `User` model already exists in `prisma/schema.prisma` with `id`, `email`, and relations to `TranscriptionJob`, `Draft`, and `ConnectedAccount`.
- All API routes currently use a hardcoded `DEV_USER_ID = 'dev-user-placeholder'` as a placeholder (12 route files).
- No session management, authentication middleware, or sign-in/sign-up UI exists yet.
- `app/page.tsx` is a placeholder landing page that can be repurposed as or redirected from the sign-in page.
- NextAuth.js (Auth.js v5) is the recommended implementation — it integrates natively with the App Router, supports credentials + OAuth, and produces HTTP-only session cookies with minimal boilerplate.

## Design

### Visual Layout

**Sign-In Page (`/sign-in`):**
- Centered card (max-w-sm) on a neutral full-height background.
- App name / logo at the top of the card.
- Email + Password fields with inline validation feedback.
- "Sign In" primary button (full-width).
- "Don't have an account? Register" link below the button.
- Error alert for invalid credentials.

**Register Page (`/register`):**
- Same card layout as sign-in.
- Email, Password, Confirm Password fields.
- "Create Account" primary button.
- "Already have an account? Sign in" link.
- Validation errors shown inline below each field.

**Sign-Out:**
- "Sign Out" button available in the dashboard navigation/header.
- Triggers server action → redirects to `/sign-in`.

### Color and Typography

- **Background**: `bg-gray-50 dark:bg-gray-950`
- **Card**: `bg-white dark:bg-gray-900 shadow-md rounded-xl`
- **Typography**:
  - Heading: `font-semibold text-2xl text-gray-900 dark:text-white`
  - Labels: `text-sm font-medium text-gray-700 dark:text-gray-300`
  - Links: `text-blue-600 hover:underline dark:text-blue-400`
- **Buttons**: shadcn `Button` (default variant for primary, ghost for link-style)
- **Inputs**: shadcn `Input` component
- **Error Alert**: shadcn `Alert` (destructive variant)

### Interaction Patterns

- **Form Submission**: Client-side validation first; if valid, POST to NextAuth credentials endpoint; show inline error on 401.
- **Loading State**: "Sign In" button shows spinner / disabled state while request is in-flight.
- **Redirect After Sign-In**: Successful authentication redirects to `/dashboard`.
- **Redirect After Sign-Out**: Clears session cookie, redirects to `/sign-in`.
- **Protected Route Redirect**: Unauthenticated access to `/dashboard` or `/settings` redirects to `/sign-in?callbackUrl=...`.

### Measurements and Spacing

```
Auth page container:  min-h-screen flex items-center justify-center
Card:                 w-full max-w-sm p-8 space-y-6
Form fields:          space-y-4
Input height:         h-10 (shadcn default)
Button:               w-full h-10
```

### Responsive Behavior

- **Desktop / Tablet (md: 768px+)**: Card centered, max-w-sm, horizontal padding from body.
- **Mobile (< 768px)**: Card fills available width with `mx-4`; same vertical centering.

## Technical Requirements

### Component / File Structure

```
app/
├── (auth)/
│   ├── sign-in/
│   │   └── page.tsx                   # Sign-in page (server component shell, client form)
│   │   └── _components/
│   │       └── SignInForm.tsx          # 'use client' credentials form
│   └── register/
│       └── page.tsx                   # Register page (server component shell, client form)
│       └── _components/
│           └── RegisterForm.tsx        # 'use client' registration form
├── api/
│   └── auth/
│       └── [...nextauth]/
│           └── route.ts               # NextAuth catch-all route handler
├── auth.ts                            # NextAuth config (providers, callbacks, session shape)
├── middleware.ts                      # Route protection (redirects unauthenticated users)
lib/
└── auth-session.ts                    # Server-side helper: getServerSession() wrapper
types/
└── auth.ts                            # Extended Session / JWT type augmentation
prisma/
└── schema.prisma                      # Add password hash field to User model
```

### Required Components

- [ ] `app/(auth)/sign-in/_components/SignInForm.tsx` — Email/password form using `signIn('credentials', ...)`
- [ ] `app/(auth)/register/_components/RegisterForm.tsx` — Registration form calling `/api/auth/register`
- [ ] `app/api/auth/register/route.ts` — POST handler: validate input, hash password, create User
- [ ] `app/api/auth/[...nextauth]/route.ts` — NextAuth App Router handler
- [ ] `app/auth.ts` — NextAuth `NextAuth()` config with Credentials provider
- [ ] `middleware.ts` — `auth` middleware from NextAuth protecting `/dashboard` and `/settings`
- [ ] `lib/auth-session.ts` — `getCurrentUserId()` server helper used in API routes
- [ ] Sign-out button integrated into dashboard header/nav

### State Management Requirements

```typescript
// types/auth.ts — Session shape augmentation
import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
    } & DefaultSession['user'];
  }
}

// app/auth.ts — Runtime shape
interface SessionUser {
  id: string;
  email: string;
}
```

### Password Security Requirements

- Passwords hashed with **bcrypt** (`bcryptjs` package, `saltRounds = 12`).
- Plain-text passwords are **never** stored or logged.
- Minimum password length: 8 characters (validated at both client and server).
- `password` field on `User` model is `String?` (nullable to allow future OAuth-only users).

## Acceptance Criteria

### Layout & Content

1. **Sign-In Page (`/sign-in`)**
   - Renders a centered card with email + password fields and "Sign In" button.
   - Shows app branding (name/logo) at the top.
   - Link to `/register` present below the form.

2. **Register Page (`/register`)**
   - Renders email, password, and confirm-password fields with "Create Account" button.
   - Link to `/sign-in` present below the form.

### Functionality

1. **Registration**
   - [ ] User can register with a valid email and password (≥ 8 characters).
   - [ ] Duplicate email returns a 409 error with a clear message ("An account with this email already exists").
   - [ ] Password stored as bcrypt hash — never retrievable in plain text.
   - [ ] On successful registration, user is signed in automatically and redirected to `/dashboard`.

2. **Sign-In**
   - [ ] User can sign in with correct credentials.
   - [ ] Invalid credentials show an inline error ("Invalid email or password") — no disclosure of which field is wrong.
   - [ ] Successful sign-in redirects to `/dashboard` (or `callbackUrl` if present).
   - [ ] Session established via HTTP-only, `SameSite=lax` cookie (managed by NextAuth).

3. **Session & Protection**
   - [ ] Unauthenticated `GET /dashboard` redirects to `/sign-in?callbackUrl=%2Fdashboard`.
   - [ ] Unauthenticated `GET /settings` redirects to `/sign-in?callbackUrl=%2Fsettings`.
   - [ ] Unauthenticated API calls to protected routes return `401 { error: "Unauthorized", code: "UNAUTHORIZED" }`.
   - [ ] Authenticated session persists across page refreshes (cookie-based, not memory).

4. **Sign-Out**
   - [ ] Clicking "Sign Out" calls `signOut()` and redirects to `/sign-in`.
   - [ ] Subsequent requests after sign-out are rejected / redirected correctly.

5. **Data Isolation**
   - [ ] All 12 API routes replace `DEV_USER_ID` with the authenticated `session.user.id`.
   - [ ] Queries using `userId` return only the current user's data.
   - [ ] Attempting to access another user's resource (e.g., wrong `draftId`) returns `403` or `404`.

### Navigation Rules

- `/sign-in` and `/register` are publicly accessible.
- `/dashboard` and `/settings` require authentication; redirect to `/sign-in` if unauthenticated.
- After sign-in, `callbackUrl` query param is used to return the user to their original destination.
- Root `/` redirects authenticated users to `/dashboard` and unauthenticated users to `/sign-in`.

### Error Handling

- Client-side: Email format and minimum password length validated before submission.
- Server-side: All inputs validated in route handlers independent of client validation.
- `PrismaClientKnownRequestError` with code `P2002` (unique constraint) on email → 409 response.
- Generic 500 errors must not expose stack traces or internal messages to the client.
- NextAuth errors (e.g., `CredentialsSignin`) mapped to user-friendly messages.

## Modified Files

```
prisma/
└── schema.prisma                                          ✅  Add `password String?` to User model

app/
├── auth.ts                                                ✅  NEW — NextAuth config
├── middleware.ts                                          ✅  NEW — Route protection
├── layout.tsx                                             ✅  Wrap with SessionProvider (if needed)
├── page.tsx                                               ✅  Redirect to /sign-in or /dashboard
├── (auth)/
│   ├── sign-in/
│   │   ├── page.tsx                                       ✅  NEW
│   │   └── _components/SignInForm.tsx                     ✅  NEW
│   └── register/
│       ├── page.tsx                                       ✅  NEW
│       └── _components/RegisterForm.tsx                   ✅  NEW
├── api/
│   └── auth/
│       ├── [...nextauth]/route.ts                         ✅  NEW
│       └── register/route.ts                              ✅  NEW
│   ├── transcription/route.ts                             ✅  Replace DEV_USER_ID
│   ├── transcription/[jobId]/route.ts                     ✅  Add ownership check
│   ├── ingestion/route.ts                                 ✅  Replace DEV_USER_ID
│   ├── ingestion/[jobId]/route.ts                         ✅  Add ownership check
│   ├── repurpose/twitter-thread/route.ts                  ✅  Replace DEV_USER_ID
│   ├── repurpose/twitter-thread/stream/route.ts           ✅  Replace DEV_USER_ID
│   ├── repurpose/linkedin-post/route.ts                   ✅  Replace DEV_USER_ID
│   ├── repurpose/linkedin-post/stream/route.ts            ✅  Replace DEV_USER_ID
│   ├── repurpose/blog-post/route.ts                       ✅  Replace DEV_USER_ID
│   ├── repurpose/blog-post/stream/route.ts                ✅  Replace DEV_USER_ID
│   ├── drafts/[draftId]/route.ts                          ✅  Replace DEV_USER_ID + ownership check
│   ├── drafts/[draftId]/schedule/route.ts                 ✅  Replace DEV_USER_ID
│   ├── settings/connected-accounts/route.ts               ✅  Replace DEV_USER_ID
│   ├── settings/connected-accounts/[accountId]/route.ts   ✅  Replace DEV_USER_ID
│   └── auth/buffer/callback/route.ts                      ✅  Replace DEV_USER_ID
└── dashboard/
    └── _components/
        └── SignOutButton.tsx                               ✅  NEW — Sign Out button

lib/
└── auth-session.ts                                        ✅  NEW — getCurrentUserId() helper

types/
└── auth.ts                                                ✅  NEW — Session type augmentation
```

## Status

✅ COMPLETED

1. **Setup & Configuration**
   - [x] Install `next-auth@beta` (Auth.js v5), `bcryptjs`, `@types/bcryptjs`
   - [x] Add `AUTH_SECRET` env var (generate with `npx auth secret`)
   - [x] Add `NEXTAUTH_URL` env var (for production)
   - [x] Update `.env.example` with new required vars
   - [x] Add `password String?` to User model in `schema.prisma`
   - [x] Run `npx prisma migrate dev --name add-user-password`
   - [x] Create `types/auth.ts` with Session type augmentation
   - [x] Create `app/auth.ts` with NextAuth Credentials provider config

2. **Auth API Routes**
   - [x] Create `app/api/auth/[...nextauth]/route.ts` catch-all handler
   - [x] Create `app/api/auth/register/route.ts` POST handler (validate → hash → create User)
   - [x] Create `lib/auth-session.ts` with `getCurrentUserId()` helper

3. **Middleware & Route Protection**
   - [x] Create `middleware.ts` using NextAuth `auth` export to protect `/dashboard` and `/settings`
   - [x] Update `app/page.tsx` to redirect authenticated → `/dashboard`, unauthenticated → `/sign-in`

4. **Auth UI Pages**
   - [x] Create `app/(auth)/sign-in/page.tsx` page shell
   - [x] Create `app/(auth)/sign-in/_components/SignInForm.tsx` credentials form
   - [x] Create `app/(auth)/register/page.tsx` page shell
   - [x] Create `app/(auth)/register/_components/RegisterForm.tsx` registration form
   - [x] Add sign-out button to dashboard (new `SignOutButton` component + header)

5. **Wire Real User ID into All API Routes (15 routes)**
   - [x] `app/api/transcription/route.ts`
   - [x] `app/api/transcription/[jobId]/route.ts`
   - [x] `app/api/ingestion/route.ts`
   - [x] `app/api/ingestion/[jobId]/route.ts`
   - [x] `app/api/repurpose/twitter-thread/route.ts`
   - [x] `app/api/repurpose/twitter-thread/stream/route.ts`
   - [x] `app/api/repurpose/linkedin-post/route.ts`
   - [x] `app/api/repurpose/linkedin-post/stream/route.ts`
   - [x] `app/api/repurpose/blog-post/route.ts`
   - [x] `app/api/repurpose/blog-post/stream/route.ts`
   - [x] `app/api/drafts/[draftId]/route.ts`
   - [x] `app/api/drafts/[draftId]/schedule/route.ts`
   - [x] `app/api/settings/connected-accounts/route.ts`
   - [x] `app/api/settings/connected-accounts/[accountId]/route.ts`
   - [x] `app/api/auth/buffer/callback/route.ts`

6. **Testing**
   - [ ] Verify sign-up → sign-in → sign-out flow end-to-end in browser
   - [ ] Verify unauthenticated access to `/dashboard` redirects to `/sign-in`
   - [ ] Verify API routes return `401` without session
   - [ ] Verify password is stored hashed in DB (confirm via Prisma Studio)
   - [ ] Verify duplicate email registration returns 409

## Dependencies

- `next-auth@beta` (Auth.js v5 — App Router native, Next.js 16 compatible)
- `bcryptjs` + `@types/bcryptjs` — password hashing
- `AUTH_SECRET` environment variable (random 32-byte secret for session encryption)
- `NEXTAUTH_URL` environment variable (canonical origin, required in production)
- Existing `lib/prisma.ts` singleton
- shadcn `Input` component (`npx shadcn@latest add input` — may already be present)

## Related Stories

- Story 01–06 (all existing features) — all will have their `DEV_USER_ID` replaced with real session user ID

## Notes

### Technical Considerations

1. **Auth.js v5 (next-auth@beta)** is the correct package for Next.js 16 / App Router. The stable v4 uses `pages/api/auth` and is incompatible with the App Router conventions used here.
2. **Credentials provider** requires the `AUTH_SECRET` env var; sessions are JWTs encrypted with this secret, stored in an HTTP-only cookie.
3. **`getCurrentUserId()` helper** pattern: call `auth()` from `app/auth.ts` in each route handler; if `session` is null, return `401` immediately. This replaces every `DEV_USER_ID` usage.
4. **Route grouping `(auth)`**: The `(auth)` folder is a Next.js route group — it does not appear in the URL. `/sign-in` and `/register` are the actual paths.
5. **Prisma `User.password` nullable**: Set as `String?` so future OAuth-only users (Google, GitHub) can be created without a password field.
6. **bcrypt salt rounds**: Use `12` for a good security/performance balance in production. Lower (e.g., `10`) is acceptable for development speed.
7. **Ownership checks**: When fetching resources by ID (e.g., `GET /api/transcription/:jobId`), always filter by both `id` AND `userId` to prevent IDOR vulnerabilities.
8. **`callbackUrl` on redirect**: NextAuth middleware automatically appends `?callbackUrl=...` when redirecting to sign-in; handle this in `SignInForm` via `useSearchParams()`.

### Business Requirements

- Passwords are never stored or returned in plain text — enforced at DB schema level (no plain-text field) and application level (hash before persist).
- Sessions must be HTTP-only cookies; localStorage/sessionStorage is not acceptable for session tokens.
- All user data in PostgreSQL is scoped by `userId`; cross-user access must be impossible via the API.

### API Integration

#### New Route: `POST /api/auth/register`

```typescript
// Request
interface RegisterRequest {
  email: string;       // valid email format
  password: string;    // minimum 8 characters
}

// Response 201
interface RegisterResponse {
  userId: string;
}

// Error responses
// 400: { error: "Invalid input", code: "VALIDATION_ERROR" }
// 409: { error: "An account with this email already exists", code: "EMAIL_TAKEN" }
// 500: { error: "Registration failed", code: "INTERNAL_ERROR" }
```

#### Updated Pattern for Protected API Routes

```typescript
// lib/auth-session.ts
import { auth } from '@/app/auth';

export async function getCurrentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

// In any protected route handler:
const userId = await getCurrentUserId();
if (!userId) {
  return NextResponse.json(
    { error: 'Unauthorized', code: 'UNAUTHORIZED' },
    { status: 401 }
  );
}
```

#### NextAuth Credentials Provider Shape

```typescript
// app/auth.ts (config skeleton)
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (credentials) => {
        // 1. Validate credentials shape
        // 2. Look up User by email in Prisma
        // 3. Compare password with bcrypt.compare()
        // 4. Return { id, email } or null
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      return session;
    },
  },
  pages: {
    signIn: '/sign-in',
  },
});
```

### Testing Requirements

#### Integration Tests (Manual / E2E)

```
REGISTER FLOW
  - Submit form with valid email + password → redirected to /dashboard
  - Submit form with existing email → inline error "An account with this email already exists"
  - Submit form with password < 8 chars → inline validation error shown
  - Submit form with invalid email format → inline validation error shown

SIGN-IN FLOW
  - Submit correct credentials → redirected to /dashboard
  - Submit wrong password → inline error "Invalid email or password"
  - Submit unknown email → inline error "Invalid email or password" (no enumeration)
  - Visit /dashboard unauthenticated → redirected to /sign-in?callbackUrl=%2Fdashboard
  - Sign in from /sign-in?callbackUrl=%2Fdashboard → redirected back to /dashboard

SIGN-OUT FLOW
  - Click Sign Out in dashboard → redirected to /sign-in
  - Reload /dashboard after sign-out → redirected to /sign-in

API PROTECTION
  - POST /api/transcription without session → 401 Unauthorized
  - GET /api/transcription/:jobId belonging to another user → 404 Not Found

PERSISTENCE
  - Sign in, close tab, reopen /dashboard → still authenticated (cookie persists)
```

#### Accessibility

- All form inputs have associated `<label>` elements or `aria-label`.
- Error messages are linked to their input via `aria-describedby`.
- Submit button has a loading state communicated via `aria-busy` or visible spinner.
