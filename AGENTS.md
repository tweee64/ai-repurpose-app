<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# AI Repurpose App — Agent Instructions

## Project Overview

An AI-powered content repurposing tool. Users submit a YouTube URL → the audio is downloaded with **yt-dlp** → transcribed via **Groq Whisper** → repurposed into social content (Twitter threads, LinkedIn posts) by **Groq LLM (llama-3.3-70b-versatile)**. All jobs and drafts are persisted in **PostgreSQL via Prisma**.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.x (App Router) |
| Language | TypeScript 5, strict mode |
| UI | React 19, Tailwind CSS v4 |
| Database | PostgreSQL + Prisma 7 (`@prisma/adapter-pg`) |
| AI / LLM | Groq API via `openai` SDK (OpenAI-compatible base URL) |
| Transcription | Groq Whisper (`whisper-large-v3`) |
| AI SDK (alt) | `@anthropic-ai/sdk` (available, not yet wired to routes) |
| Audio download | `yt-dlp` (spawned as child process) |
| Font | Geist / Geist Mono via `next/font/google` |

---

## Project Structure

```
app/
  api/
    transcription/
      route.ts              # POST — submit YouTube URL, start job
      [jobId]/route.ts      # GET  — poll job status + transcript
    repurpose/
      twitter-thread/
        route.ts            # POST — generate Twitter thread from transcript
  dashboard/
    page.tsx                # Main UI page
    _components/            # Co-located, private UI components + hooks
  generated/prisma/         # Auto-generated Prisma client (do not edit)
  globals.css
  layout.tsx
lib/
  claude.ts                 # Groq LLM (twitter thread generation)
  prisma.ts                 # Singleton Prisma client
  storage.ts                # Temp-file helpers
  whisper.ts                # Groq Whisper transcription
  ytdlp.ts                  # yt-dlp audio download
  youtube-url.ts            # YouTube URL validation
  queue/
    transcription-worker.ts # Fire-and-forget pipeline: download → transcribe → persist
types/
  repurpose.ts              # Types for drafts, tweets, API shapes
  transcription.ts          # Types for jobs, transcripts, API shapes
prisma/
  schema.prisma             # DB schema (User, TranscriptionJob, Transcript, Draft)
prisma.config.ts            # Prisma config with dotenv
```

---

## Environment Variables

Always read from `process.env` at call-time (never at module import time). Required variables:

- `DATABASE_URL` — PostgreSQL connection string
- `SHADOW_DATABASE_URL` — PostgreSQL shadow DB used by `prisma migrate dev` (required in development)
- `GROQ_API_KEY` — Groq API key (used for both Whisper transcription and LLM inference)
- `ANTHROPIC_API_KEY` — Anthropic API key (Claude via `@anthropic-ai/sdk`; wired to future routes)
- `STORAGE_BUCKET` — Object storage bucket name (S3/Cloudflare R2 for temp audio files)
- `STORAGE_ENDPOINT` — Object storage endpoint URL
- `STORAGE_REGION` — Object storage region (e.g. `auto` for R2)
- `STORAGE_ACCESS_KEY_ID` — Object storage access key
- `STORAGE_SECRET_ACCESS_KEY` — Object storage secret key
- `YTDLP_PATH` *(optional)* — override path to `yt-dlp` binary (defaults to `yt-dlp` on PATH)

Never commit secrets. Never log or expose env vars in client-side code. Use `.env.example` (committed, no real values) as the canonical list of required vars.

---

## Next.js App Router Rules

- All routes live under `app/`. Use the App Router — no `pages/` directory.
- Route handlers use `route.ts` with named exports (`GET`, `POST`, etc.).
- Server Components are the default. Mark client components with `'use client'` only when needed (event handlers, hooks, browser APIs).
- Data fetching: use `fetch` with Next.js cache options in Server Components, or Route Handler + `useEffect`/custom hook on the client.
- Private co-located components go in `_components/` folders inside the route segment.
- Custom hooks live alongside their components (e.g., `app/dashboard/_components/useTranscriptionJob.ts`).
- Use `next/image` for all images. Use `next/font` for fonts.
- Never use `getServerSideProps` or `getStaticProps` — those are Pages Router APIs.

---

## TypeScript Rules

- `strict: true` is enforced. No `any` unless absolutely unavoidable — prefer `unknown` and narrow.
- Use `import type` for type-only imports.
- Shared types live in `types/`. Do not define API shapes inline in route files.
- Use `interface` for object shapes, `type` for unions/aliases.
- Avoid type assertions (`as Foo`) unless you have verified the shape.

---

## Prisma Rules

- The generated client is at `app/generated/prisma/` — import from `@/app/generated/prisma/client`.
- Use the singleton from `lib/prisma.ts` — never instantiate `PrismaClient` directly.
- Schema is in `prisma/schema.prisma`. After schema changes run:
  ```
  npx prisma migrate dev
  npx prisma generate
  ```
- Never write raw SQL unless Prisma cannot express the query.
- Always handle `PrismaClientKnownRequestError` (e.g., unique constraint = P2002) in route handlers.

---

## API Route Handler Rules

- Return consistent JSON error shapes: `{ error: string; code: string }` for all 4xx/5xx.
- Validate all user input at the route boundary. Never trust `req.body` without validation.
- For long-running work (download + transcription), update the `TranscriptionJob.status` field through each stage (`downloading` → `transcribing` → `completed` / `failed`).
- Do not await long tasks synchronously in a Route Handler if it can be avoided — use a fire-and-forget pattern (kick off work, respond with `jobId`, let client poll).
- Set appropriate HTTP status codes (201 for creation, 202 for accepted async work, 400 for bad input, 404, 500).

---

## Tailwind CSS v4 Rules

- Tailwind v4 uses a CSS-first config — no `tailwind.config.js`. Configuration lives in `app/globals.css` using `@theme` and `@layer`.
- Do not create a `tailwind.config.js/ts` — it will conflict.
- Use utility classes directly in JSX. Avoid arbitrary values when a design-token equivalent exists.
- Dark mode uses the `dark:` variant (class-based or media-based per your CSS config).

---

## shadcn/ui + Radix UI Rules

shadcn/ui is the component library for this project. Components are copied into `components/ui/` (not imported from npm) and styled with Tailwind v4 utility classes.

**Setup (run once if not already done):**
```bash
npx shadcn@latest init
```
Accept the defaults — it will create `components/ui/`, `lib/utils.ts`, and add `clsx`/`tailwind-merge` to `package.json`.

**Adding components:**
```bash
npx shadcn@latest add <component>   # e.g. button, card, badge, skeleton, textarea
```
Never hand-write Radix primitives directly — always add via the shadcn CLI so the component lands in `components/ui/` with the correct variant API.

**Usage rules:**
- Import from `@/components/ui/<component>` — never from `radix-ui` directly in page/feature code.
- Use the `cn()` helper from `lib/utils.ts` (combines `clsx` + `tailwind-merge`) for conditional class merging. Never concatenate class strings manually.
- Extend component variants using the `cva` (class-variance-authority) pattern already established in each `components/ui/` file — do not override styles with inline `style` props.
- Radix primitives (`@radix-ui/*`) are peer dependencies of shadcn components — do not import them directly in feature code.
- Keep `components/ui/` files unmodified where possible. If customisation is needed, compose or wrap the component rather than editing the base file.
- Use `lucide-react` for all icons (installed by shadcn init). Do not add a second icon library.

**Components available for this app:**

| Component | Use case |
|---|---|
| `Card` | Job status cards, transcript panels |
| `Badge` | Job status labels (`pending`, `downloading`, `transcribing`, `completed`, `failed`) |
| `Button` | URL submit, copy-to-clipboard, generate actions |
| `Textarea` | Editable draft content |
| `Skeleton` | Loading states while polling job status |
| `Separator` | Section dividers in the thread display |
| `ScrollArea` | Scrollable tweet thread list |
| `Toast` / Sonner | Success and error notifications |

---

## Security Practices

- **Input validation**: Validate YouTube URLs using `lib/youtube-url.ts` before passing to yt-dlp. Never interpolate user input into shell strings.
- **Shell injection**: `ytdlp.ts` uses `spawn` with an argument array — always maintain this pattern. Never use `exec` with interpolated user input.
- **Secrets**: Environment variables are server-side only. Never import `lib/prisma.ts`, `lib/claude.ts`, or `lib/whisper.ts` in Client Components.
- **Error messages**: Do not expose internal stack traces or DB error details in API responses. Log server-side, return generic messages client-side.
- **File handling**: Temp files written to `os.tmpdir()` must be cleaned up after use via `lib/storage.ts`.
- **OWASP Top 10**: Treat all external input (URLs, API responses, LLM output) as untrusted. Parse and validate before use.

---

## AI / LLM Integration Rules

- LLM output is untrusted — always parse and validate JSON before using it.
- Strip markdown code fences from LLM responses before `JSON.parse` (models sometimes wrap JSON in fences).
- Prompt constants are module-level `const` strings. Keep prompts co-located with the function that uses them.
- Groq API is accessed via the `openai` SDK with `baseURL: 'https://api.groq.com/openai/v1'`.
- Use lazy-initialised singleton clients (see pattern in `lib/claude.ts` and `lib/whisper.ts`) — never instantiate at module load.

---

## Coding Conventions

- **File naming**: `kebab-case` for files, `PascalCase` for React components, `camelCase` for functions/variables.
- **Imports**: Use the `@/` alias (maps to project root). Group: external → internal libs → local.
- **No default exports from lib files** — use named exports. Default exports are fine for Next.js pages/layouts/route handlers (required by the framework).
- **Do not add comments** to code that is self-explanatory. Add JSDoc only for non-obvious public functions.
- **Async/await** over raw Promises. Catch errors at the boundary, not inside helpers.
- **No magic numbers** — extract constants with meaningful names.

---

## Commands

```bash
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build
npm run lint         # ESLint

npx prisma migrate dev       # Apply schema changes + regenerate client
npx prisma generate          # Regenerate client without migrating
npx prisma studio            # Open Prisma Studio (DB GUI)
```
