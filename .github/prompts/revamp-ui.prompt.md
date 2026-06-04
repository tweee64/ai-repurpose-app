---
name: revamp-ui
description: Revamp the dashboard UI to use the shadcn/ui + Tailwind CSS v4 component stack defined in AGENTS.md. Replaces hand-written raw HTML elements with Card, Badge, Button, Skeleton, ScrollArea, Separator, and Sonner toast components. Swaps inline SVG spinners for lucide-react icons. Use when upgrading, migrating, or polishing the dashboard UI.
agent: agent
tools: [search, read_file, replace_string_in_file, multi_replace_string_in_file, create_file, run_in_terminal, get_errors]
---

You are a UI migration specialist for this Next.js + React + TypeScript project. Your task is to revamp the dashboard UI by replacing all hand-written raw HTML elements with shadcn/ui components, following the rules in [AGENTS.md](../../AGENTS.md).

**Execute all changes directly** — do not suggest or describe edits, write the code. Read each file before editing it, apply all changes using `replace_string_in_file` or `multi_replace_string_in_file`, run terminal commands to install components and validate, and fix any errors before moving on.

## Stack Reference

- **Components** live in `components/ui/` — never import from `radix-ui` directly in feature code
- **Icons** — use `lucide-react` exclusively; remove all inline SVG spinners
- **Class merging** — use `cn()` from `lib/utils.ts`; never concatenate class strings manually
- **Tailwind v4** — no `tailwind.config.js`; config is in `app/globals.css` only

## Step 1 — Bootstrap (if needed)

Check whether shadcn/ui is already initialised:

```bash
ls components/ui 2>/dev/null || echo "not found"
```

If `components/ui/` does not exist, run:

```bash
npx shadcn@latest init
```

Accept all defaults.

## Step 2 — Add required components

Add every component the revamp needs. Only add what is missing:

```bash
npx shadcn@latest add button card badge skeleton textarea separator scroll-area sonner
```

Confirm each component landed in `components/ui/`.

## Step 3 — Migrate each dashboard component

Migrate the files below **one at a time**. After each file, run `npm run build` (or check for TypeScript errors) before moving on.

### `app/dashboard/_components/UrlInputForm.tsx`

- Replace `<input type="url" ...>` with the shadcn `Input` component (add via `npx shadcn@latest add input` if not present)
- Replace the raw `<button type="submit">` with shadcn `<Button>`
- Replace the inline SVG spinner with `<Loader2 className="animate-spin h-4 w-4" />` from `lucide-react`
- Use `cn()` for any conditional class logic

### `app/dashboard/_components/TranscriptionJobCard.tsx`

- Wrap content in shadcn `<Card>` + `<CardContent>`
- Replace the inline SVG spinner with `<Loader2 className="animate-spin ..." />` from `lucide-react`
- Replace the status text with a shadcn `<Badge variant="secondary">`
- Keep the animated progress bar (it uses a Tailwind CSS animation; no shadcn equivalent)

### `app/dashboard/_components/ErrorBanner.tsx`

- Wrap in shadcn `<Card>` with a destructive/red style (use `cn()` + Tailwind for red border/bg, or use `variant` if available)
- Replace the retry button with shadcn `<Button variant="destructive">`
- Add `<AlertCircle />` from `lucide-react` as a leading icon

### `app/dashboard/_components/TranscriptDisplay.tsx`

- Wrap the transcript text in a shadcn `<Card>` + `<CardContent>`
- Replace any raw copy button with shadcn `<Button variant="outline" size="sm">`
- Add `<Copy />` and `<Check />` icons from `lucide-react` for copy state feedback

### `app/dashboard/_components/GenerateActionsBar.tsx`

- Replace raw `<button>` elements with shadcn `<Button>` (use `variant="default"` for the primary generate action)
- Use `<Sparkles />` or `<Wand2 />` icon from `lucide-react` on the generate button
- Replace any loading spinner with `<Loader2 className="animate-spin" />`

### `app/dashboard/_components/TweetCard.tsx`

- Wrap each tweet in a shadcn `<Card>` + `<CardContent>`
- Replace the raw copy button with shadcn `<Button variant="ghost" size="icon">`
- Use `<Copy />` / `<Check />` from `lucide-react`

### `app/dashboard/_components/TwitterThreadDisplay.tsx`

- Wrap the thread list in a shadcn `<ScrollArea>` with a fixed max height (e.g. `max-h-[600px]`)
- Add `<Separator />` between tweets
- Replace loading skeletons (if any) with shadcn `<Skeleton>`
- Replace the retry button with shadcn `<Button variant="outline">`
- Replace any error text with a `<Badge variant="destructive">` or inline styled `<Card>`

### `app/dashboard/page.tsx`

- No structural changes required unless layout improvements are needed
- Ensure all imports resolve correctly after component rewrites

## Step 4 — Wire up Sonner toasts (if copy-to-clipboard exists)

If any component calls a toast on copy success, replace custom toast logic with Sonner:

1. Add `<Toaster />` from `sonner` to `app/layout.tsx` (inside `<body>`, after `{children}`)
2. Call `toast("Copied!")` from `sonner` in copy handlers

## Step 5 — Validate

```bash
npm run build
npm run lint
```

Fix all TypeScript and ESLint errors before finishing. Do not leave `any` types or unused imports.

## Constraints

- Do **not** modify files in `components/ui/` — compose or wrap instead
- Do **not** add a `tailwind.config.js` — Tailwind v4 config lives in `app/globals.css`
- Do **not** import `@radix-ui/*` directly in feature code
- Do **not** expose server-side env vars in Client Components
- Keep all existing prop interfaces and hook contracts unchanged — this is a visual-only migration
