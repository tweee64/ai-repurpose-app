---
name: write-user-stories
description: 'Generate INVEST-compliant user stories from a meeting transcript or feature description, saved as individual Markdown files in docs/stories/. Use when: writing user stories, generating stories from transcript, extracting requirements from meeting notes, creating backlog items, writing acceptance criteria, slicing features into stories.'
argument-hint: 'Paste transcript text, or reference a transcript file'
---

# Write User Stories

Analyze a meeting transcript or feature description and produce well-formed, INVEST-compliant user stories saved to `docs/stories/`.

## When to Use

- Turning a raw meeting transcript into backlog-ready stories
- Extracting requirements from a feature brief or design doc
- Decomposing an epic into independently shippable slices
- Writing or reviewing acceptance criteria for existing stories

## Procedure

### 1. Gather Input

- If the user pastes raw text, treat that as the transcript.
- If the user references a file, read it with the file-reading tool before proceeding.
- Identify the **user roles** mentioned. If none are explicit, infer logical types (`user`, `admin`, `guest`, etc.).

### 2. Extract Candidate Stories

Scan the transcript for:
- Desired **actions** ("users need to…", "we want to be able to…")
- Stated **pain points** or goals → each is a candidate story
- **Roles / personas** associated with each need
- Explicit **acceptance criteria** or constraints already discussed

Group tightly related needs into a single story. Keep each story small enough to fit in one sprint.

### 3. Apply INVEST Principles

Check every candidate story against each principle before writing it:

| Principle | Check |
|-----------|-------|
| **I**ndependent | Can this be built without blocking other stories in the same batch? |
| **N**egotiable | Does it capture the essence (not a rigid contract)? |
| **V**aluable | Is the "so that" benefit clear and user-facing? |
| **E**stimable | Would a developer understand what done looks like? |
| **S**mall | Can it ship within a single iteration? |
| **T**estable | Can acceptance criteria be written for it? |

If a story fails **Small**, split it. If it fails **Valuable**, merge it into another story or discard it.

### 4. Apply Vertical Slicing

**DO** — write stories that span the full stack and deliver end-to-end value:
> "As a user, I want to log in with email and password so that I can access my account."

**DO NOT** — split by technical layer (these are tasks, not stories):
- ~~"Create the login database table"~~
- ~~"Build the login API endpoint"~~
- ~~"Design the login UI"~~

### 5. Write Each Story

Use [the story template](./assets/story-template.md).

- **Title**: concise goal phrase (3–6 words)
- **Role**: specific persona from the transcript (or inferred)
- **Action**: what they want to do
- **Benefit**: the measurable value they gain
- **Acceptance Criteria**: bullet list of verifiable conditions. Include at least 2.
- **Notes**: open questions, constraints, or context from the transcript (optional)

### 6. Number and Save Stories

- Determine the next available two-digit sequence number by listing existing files in `docs/stories/`. Start at `01` if the directory is empty or does not exist.
- Use the naming pattern: `NN-kebab-case-goal.md` (e.g., `03-filter-by-category.md`).
- Create `docs/stories/` if it does not exist.
- Save each story as a separate file.

### 7. Confirm Output

After saving all files, list the stories created with their titles and file paths. Ask the user:
1. Are any stories missing from the transcript?
2. Should any story be split further or merged?
3. Are the acceptance criteria complete?

Refine and re-save based on feedback.

## Quality Checklist

Before finishing, confirm:
- [ ] Every story follows the "As a… I want… so that…" format
- [ ] Every story has ≥2 acceptance criteria
- [ ] No story represents a single technical layer
- [ ] Files are saved with sequential numbering
- [ ] No duplicate story numbers exist in `docs/stories/`
