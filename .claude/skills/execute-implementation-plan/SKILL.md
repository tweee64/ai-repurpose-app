---
name: execute-implementation-plan
description: 'Execute implementation tasks from a plan for Next.js/React/TypeScript features with automatic code review and UI validation. Use when: implementing a task or sub-task from an implementation plan, executing a story ticket, writing code for a feature, building a component, coding from a spec doc, working on an assigned task, implementing acceptance criteria. Tracks task status, validates requirements, and follows AGENTS.md code standards. Does NOT plan — use generate-implementation-plan for that.'
argument-hint: 'Task section and plan file path, e.g. "Task 2 Backend Implementation /docs/implementation-plans/01-ingest-youtube-url.md"'
---

# Execute Implementation Plan

## When to Use

- Implementing a specific task or sub-task from an existing implementation plan
- Building a component, page, API route, or lib utility from a plan doc
- Coding acceptance criteria for a ticket
- Working on an assigned task with defined scope
- Resuming in-progress development with status tracking

**NOT for planning.** If no implementation plan exists yet, use the `generate-implementation-plan` skill first.

## Role

You are an Implementation Executor specialized in **Next.js 16 App Router, React 19, TypeScript 5 (strict), Tailwind CSS v4, shadcn/ui, Prisma 7, and Groq API**. Execute **only the specified task or sub-task** — do not implement additional features or out-of-scope work. Follow code standards defined in `AGENTS.md`.

## Status Notation

Plan documents use these emoji status indicators — update them in-place as you work:

| Symbol | Meaning |
|--------|---------|
| ⬜ | NOT STARTED |
| 🚧 | IN PROGRESS |
| ✅ | COMPLETED |
| 🟥 | BLOCKED |

Task checklists inside sections use markdown checkboxes:
- `- [ ]` Not started
- `- [x]` Completed

---

## Procedure

### 1. Validate Input

Before writing any code, confirm all of the following:

- [ ] Task section is clearly identified (number + name, e.g. "Task 2 — Backend Implementation")
- [ ] Plan file path is known (under `/docs/implementation-plans/`)
- [ ] Scope is bounded — what is explicitly included and excluded
- [ ] Acceptance criteria for this task are understood
- [ ] Dependencies on other tasks are resolved or not blocking

**If ANY item is unclear, ask clarifying questions before proceeding.** Do not guess scope.

Pre-implementation questions to ask if the plan doesn't answer them:
1. Which task section number should be executed?
2. Are prerequisite tasks (e.g. Setup & Configuration) already complete?
3. Are there dependency stories that must be done first?
4. Are there specific security or performance constraints for this task?

### 2. Load Context

Read the following before writing any code:

- The implementation plan document (full file)
- Every file listed in the plan's **Modified Files** section that already exists
- `AGENTS.md` (project root) — code standards, conventions, and security rules
- The Next.js docs in `node_modules/next/dist/docs/` if the task touches routing, data fetching, or server components

### 3. Mark Task In Progress

Update the plan document **before writing code**:

1. Change the task's status line from `⬜` to `🚧`
2. Update the top-level **Status** section to `🚧 IN PROGRESS` if it was `⬜`

Example:
```
## Status

🚧 IN PROGRESS

...

2. Backend Implementation

   🚧

   - [ ] Implement `youtube-url.ts` validation utility
```

### 4. Implement

Execute only the scoped task. Apply all rules from `AGENTS.md`:

#### API Routes (`app/api/`)
- Named exports only: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`
- Return `{ error: string; code: string }` for all 4xx/5xx responses
- Validate all input at the route boundary — never trust request body without validation
- Use 201 for creation, 202 for accepted async work, 400 for bad input

#### Server-side Utilities (`lib/`)
- Named exports only (no default exports from lib files)
- Use `@/` alias for all internal imports
- Read `process.env` at call-time, never at module import time
- Lazy-initialize singleton clients (see `lib/claude.ts` pattern)
- Never import `lib/prisma.ts`, `lib/claude.ts`, or `lib/whisper.ts` in Client Components

#### React Components (`app/*/_components/`)
- Server Components by default; add `'use client'` only when needed
- Use `next/image` for images, `next/font` for fonts
- Use `cn()` from `lib/utils.ts` for class merging — never concatenate class strings
- Add shadcn components via `npx shadcn@latest add <component>`, import from `@/components/ui/<component>`
- Use `lucide-react` for icons

#### Database (Prisma)
- Import the singleton from `lib/prisma.ts` — never call `new PrismaClient()`
- Import generated types from `@/app/generated/prisma/client`
- Handle `PrismaClientKnownRequestError` (e.g. P2002 unique constraint) in route handlers
- After schema changes: `npx prisma migrate dev && npx prisma generate`

#### TypeScript
- `strict: true` — no `any`; use `unknown` and narrow instead
- `import type` for type-only imports
- Shared types in `types/`; do not define API shapes inline in route files
- No type assertions (`as Foo`) unless shape is verified

#### Security
- Shell commands: always use `spawn` with an argument array — never `exec` with interpolated input
- Validate YouTube URLs via `lib/youtube-url.ts` before passing to yt-dlp
- Never expose stack traces or DB error details in API responses
- Clean up temp files in `os.tmpdir()` via `lib/storage.ts`
- LLM output is untrusted — parse and validate JSON; strip markdown fences before `JSON.parse`

### 5. Validate Against Acceptance Criteria

For each acceptance criterion in the plan that belongs to this task:

- [ ] Confirm it is implemented
- [ ] Confirm it can be manually verified or is covered by a test
- [ ] Note any criterion that cannot be met and explain why

#### UI Validation (if this task includes frontend components)

Start the dev server and verify the feature in a browser:

```bash
npm run dev
```

Check:
- Golden path works end-to-end
- Loading, error, and empty states render correctly
- Responsive behavior at mobile and desktop breakpoints
- No TypeScript errors: `npm run lint`

### 6. Mark Task Completed

Update the plan document:

1. Change the task's status from `🚧` to `✅`
2. Check off completed checklist items: `- [ ]` → `- [x]`
3. Update the **Modified Files** section — change `⬜` to `✅` for each file touched
4. If all tasks in the plan are `✅`, update the top-level **Status** to `✅ COMPLETED`

### 7. Status Report

After completing the task, output a report:

```
Task: [Task number + name]
Status: ✅ Completed  (or 🟥 Blocked)
Plan: [Plan file path]
Overall Story Status: 🚧 In Progress  (or ✅ Completed)

Completed:
- [List of completed checklist items]

Pending (remaining tasks in plan):
- [Task 3 — Frontend Implementation]
- [Task 4 — Testing]

Blockers:
- [If any — with reason and what is needed to unblock]

Next Steps:
- [Next task to execute, or follow-up actions]
```

---

## Implementation Completion Checklist

Before marking any task `✅`:

- [ ] All checklist items in the task section are checked off
- [ ] No out-of-scope files were modified
- [ ] Code follows all standards from `AGENTS.md`
- [ ] Error handling covers failure scenarios (network, DB, external API)
- [ ] No hardcoded secrets or credentials introduced
- [ ] No `process.env` reads at module-load time
- [ ] No `any` types introduced
- [ ] Plan document is updated (status emoji + modified files)
- [ ] `npm run lint` passes with no new errors
- [ ] UI tested in browser if this task includes frontend work

---

## Common Patterns for This Project

### Fire-and-Forget Background Job

```typescript
// In POST route handler
const job = await prisma.transcriptionJob.create({ data: { ... } });
runTranscriptionWorker(job.id).catch(console.error); // fire-and-forget
return NextResponse.json({ jobId: job.id }, { status: 202 });
```

### Groq LLM Call (via openai SDK)

```typescript
import OpenAI from 'openai';
let groq: OpenAI | null = null;
const getGroqClient = () => {
  if (!groq) groq = new OpenAI({ baseURL: 'https://api.groq.com/openai/v1', apiKey: process.env.GROQ_API_KEY! });
  return groq;
};
```

### Strip LLM JSON Fences

```typescript
const raw = completion.choices[0].message.content ?? '';
const json = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
const parsed = JSON.parse(json);
```

### Consistent API Error Shape

```typescript
return NextResponse.json({ error: 'Human-readable message', code: 'MACHINE_CODE' }, { status: 400 });
```

---

## References

- `AGENTS.md` — code standards, conventions, security rules (project root)
- `/docs/implementation-plans/` — plan documents
- `node_modules/next/dist/docs/` — Next.js 16 App Router documentation
