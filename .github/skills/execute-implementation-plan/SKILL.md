---
name: execute-implementation-plan
description: 'Execute implementation tasks from a plan for Next.js/React/TypeScript features with automatic code review and UI validation. Use when: implementing a task or sub-task from an implementation plan, executing a story ticket, writing code for a feature, building a component, coding from a spec doc, working on an assigned task, implementing acceptance criteria. Tracks task status, validates requirements, and follows AI_RULES.md code standards. Does NOT plan — use generate-implementation-plan for that.'
argument-hint: 'Task ID and plan file path, e.g. "FEAT-42 Task 2.1 /docs/implementation-plans/FEAT-42-dark-mode.md"'
---

# Execute Implementation Plan

## When to Use

- Implementing a specific task or sub-task from an existing implementation plan
- Building a component, page, or feature from a spec or story doc
- Coding acceptance criteria for a ticket
- Working on an assigned task with defined scope
- Resuming in-progress development with status tracking

**NOT for planning.** If no implementation plan exists yet, use the `generate-implementation-plan` skill first.

## Role

You are an Implementation Executor specialized in Next.js, React, and TypeScript development. Your role is to execute **only the specified task or sub-task** — do not implement additional features or out-of-scope work. Follow code standards defined in `AGENTS.md`.

## Task Status Notation

Track and update status in plan documents using:

```
Story Status:    [ ] Not Started  [~] In Progress  [x] Completed  [!] Blocked
Task Status:     [ ] Not Started  [~] In Progress  [x] Completed  [!] Blocked
```

---

## Procedure

### 1. Validate Input

Before writing any code, confirm all of the following:

- [ ] Task or sub-task is clearly identified (ID or description)
- [ ] Scope is bounded — what is explicitly included and excluded
- [ ] Acceptance criteria are understood
- [ ] Dependencies on other tasks are known (blocked or available)
- [ ] Technical requirements (files, components, state) are clear

**If ANY item is unclear, ask clarifying questions before proceeding.** Do not guess scope.

Pre-implementation questions to ask if not answered by the plan:
1. What is the specific scope of this task?
2. Which components need to be created or modified?
3. Are there dependencies on other tasks that must be complete first?
4. What are the acceptance criteria for "done"?
5. Are there specific security or performance requirements?

### 2. Load Context

Use a read-only subagent or file reads to gather:
- The implementation plan document (file path from user or under `/docs/implementation-plans/`)
- Affected files listed in the plan's **Modified Files** section
- `AGENTS.md` for code standards and patterns
- Existing component structure relevant to the task

### 3. Mark Task In Progress

Update the task status in the plan document before writing code:

```
[~] Task 2.1 — Build DarkModeToggle component
```

Also update the parent story status to `[~]` if it was `[ ]`.

### 4. Implement

Execute only the scoped task:

1. **Component Development**
   - Create or modify only the files listed for this task
   - Follow naming conventions from `AI_RULES.md`
   - Add error handling for boundary conditions
   - Include logging where appropriate

2. **State & Data**
   - Follow existing state management patterns (Zustand, React context, etc.)
   - Use TypeScript interfaces defined in the plan or existing types

3. **Styling**
   - Match design specs from the plan (layout, colors, responsive behavior)
   - Use TailwindCSS utility classes and Shadcn/Radix components per project conventions

4. **Testing**
   - Write unit tests for new logic
   - Add integration tests if the plan's testing requirements specify them
   - Verify each acceptance criterion has coverage

### 5. Validate Against Acceptance Criteria

For each acceptance criterion in the plan:
- [ ] Confirm it is implemented
- [ ] Confirm it is covered by a test or can be manually verified
- [ ] Note any criterion that cannot be met and explain why

### 6. Mark Task Completed

Update the plan document:
- Change task status from `[~]` to `[x]`
- Update the **Modified Files** table with ✅ for files touched
- If all tasks in the story are `[x]`, update story status to `[x]`

### 7. Provide Status Report

After completion, output a status report in this format:

```
Task: [Task ID/Name]
Status: [x] Completed  (or [!] Blocked)
Story: [Story ID]
Story Status: [~] In Progress  (or [x] Completed)

Completed:
- [List of completed items]

Pending:
- [List of pending items, if any]

Blockers:
- [List blockers, if any — with reason and who can unblock]

Next Steps:
- [Next task in sequence or follow-up actions]
```

---

## Implementation Completion Checklist

Before marking any task `[x]`:

- [ ] All specified requirements are implemented
- [ ] No out-of-scope changes were made
- [ ] Tests are written and passing
- [ ] Code follows standards from `AGENTS.md`
- [ ] Error handling covers failure scenarios
- [ ] Plan document is updated (status, modified files)
- [ ] No hardcoded secrets or credentials introduced

---

## References

- `AGENTS.md` — code standards and patterns (load from project root)
- `/docs/implementation-plans/` — where plan documents live
