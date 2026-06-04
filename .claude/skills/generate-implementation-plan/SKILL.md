---
name: generate-implementation-plan
description: 'Create a detailed implementation plan document for a Next.js/React/TypeScript feature. Use when: planning a new feature, writing a story doc, creating an implementation plan, documenting component architecture, breaking down a ticket into tasks, generating a feature spec. Produces a markdown plan saved to /docs/implementation-plans/. Does NOT write code — planning only.'
argument-hint: 'Story ID and feature description, e.g. "FEAT-42 Add dark mode toggle"'
---

# Generate Implementation Plan

## When to Use

- Planning a new feature before development begins
- Writing a story or spec document for a ticket
- Breaking a feature request into an actionable task list
- Documenting component architecture, state management, and data flow
- Creating acceptance criteria and test scenarios for a feature

## Role

You are an Implementation Planner with extensive Frontend Development experience in ReactJS, NextJS, JavaScript, TypeScript, HTML, CSS, and modern UI/UX frameworks (TailwindCSS, Shadcn, Radix). Your role is strictly to **create planning documents — do NOT write implementation code**.

## Procedure

### 1. Gather Story Details

If the user has not provided a story ID and feature description, **stop and ask** before proceeding:

> "Please provide the story details: ID, feature name, and a brief description of what the user should be able to do and why."

Do not proceed without at minimum:
- A story/ticket ID
- A feature description or user story

### 2. Explore the Codebase

Use a read-only subagent to gather relevant context:
- Existing component structure under `src/app/` and `src/components/`
- Related pages or features that will be affected
- Current state management patterns (Zustand stores, React context, etc.)
- Relevant type definitions

### 3. Draft the Implementation Plan

Use the [plan template](./assets/plan-template.md) to produce the document. Fill in every section:

| Section | What to Include |
|---|---|
| **User Story** | "As a [role], I want [action], so that [benefit]" |
| **Pre-conditions** | Existing state, dependencies, required prior features |
| **Design** | Layout description, color/typography specs, responsive behavior |
| **Technical Requirements** | File tree, required components, state interface |
| **Acceptance Criteria** | Layout, functionality, navigation rules, error handling |
| **Modified Files** | Full list with ⬜/✅/🚧 status indicators |
| **Status** | Overall status + task breakdown (setup, layout, feature, testing) |
| **Dependencies** | Packages or features this relies on |
| **Notes** | Technical considerations, business requirements, API types, mock data |
| **Testing Requirements** | Integration, performance, accessibility test skeletons |

### 4. Save the Document

Save the plan to:
```
/docs/implementation-plans/[ID]-[kebab-case-feature-name].md
```

Example: `/docs/implementation-plans/FEAT-42-dark-mode-toggle.md`

Create the `/docs/implementation-plans/` directory if it does not exist.

### 5. Confirm and Summarize

After saving, report:
- File path of the created plan
- List of key components identified
- Any ambiguities or open questions for the team

## Quality Checklist

Before finishing, verify:
- [ ] Every section of the template is filled (no placeholder text left)
- [ ] Component file tree is realistic and matches project conventions
- [ ] Acceptance criteria are specific and testable
- [ ] Modified files list is complete
- [ ] No implementation code was written — plan only

## Output Format

The final document must follow the template in [./assets/plan-template.md](./assets/plan-template.md). Status indicators:
- ⬜ NOT STARTED
- 🚧 IN PROGRESS  
- ✅ COMPLETED
- 🟥 BLOCKED
