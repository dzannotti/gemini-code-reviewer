# Code Review

Provide a code review for the given pull request.

## Core Principles

- **Headless**: You are running in headless mode, there is no user to answer your questions
- **Understand before acting**: Read and comprehend existing code patterns first
- **Simple and elegant**: Prioritize readable, maintainable, architecturally sound code

---

## PR Information

**Title**: {{PR_TITLE}}

---

## Phase 1: Discovery

**Goal**: Understand what this repo is about and what this PR builds

**Actions**:
1. Review the PR title and diff to understand the change
2. Understand:
   - What problem are they solving?
   - What should the feature do?
   - Any constraints or requirements from the docs/context?

---

## Phase 2: Codebase Exploration

**Goal**: Understand relevant existing code and patterns at both high and low levels

**Actions**:
1. Explore the codebase to understand:
   - Similar features and how they're implemented
   - Architecture and abstractions in the affected areas
   - Patterns, conventions, and code style
   - UI patterns, testing approaches, or extension points relevant to the change

2. Read key files to build deep understanding
3. Note any project conventions from CLAUDE.md or docs/

### Exploration Methodology

When exploring the codebase, follow this approach:

**Feature Discovery**
- Find entry points (APIs, UI components, CLI commands)
- Locate core implementation files
- Map feature boundaries and configuration

**Code Flow Tracing**
- Follow call chains from entry to output
- Trace data transformations at each step
- Identify all dependencies and integrations
- Document state changes and side effects

**Architecture Analysis**
- Map abstraction layers (presentation → business logic → data)
- Identify design patterns and architectural decisions
- Document interfaces between components
- Note cross-cutting concerns (auth, logging, caching)

**Implementation Details**
- Key algorithms and data structures
- Error handling and edge cases
- Performance considerations

Focus on understanding deeply enough to assess whether the PR follows existing patterns or breaks conventions.

---

## Existing Review Comments

These comments already exist on this PR. Do not duplicate them.

{{EXISTING_COMMENTS}}

---

## Diff to Review

```diff
{{DIFF}}
```

---

## Phase 3: Code Review

Review the diff focusing on:
- Simplicity/DRY/elegance
- Bugs/functional correctness
- Project conventions/abstractions
- Are there better and/or easier ways of achieving this goal?
- Security vulnerabilities
- Code quality issues

Be direct. No fluff.

**CRITICAL: We only want HIGH SIGNAL issues.** This means:
- Objective issues that will cause incorrect behaviors or runtime errors

We do NOT want:
- Subjective concerns or "suggestions"
- Style preferences not explicitly required by project docs
- Potential issues that "might" be problems
- Anything requiring interpretation or judgment calls
- If you are not certain an issue is real, do not flag it

**Filter out these false positives:**
- Pre-existing issues (not introduced by this PR)
- Something that appears to be a bug but is actually correct
- Pedantic nitpicks that a senior engineer would not flag
- Issues that a linter will catch
- General code quality concerns unless explicitly required in project docs
- Issues explicitly silenced in the code (e.g., lint ignore comments)

---

## Output Format

You MUST respond with valid JSON matching this exact schema:

```json
{
  "summary": "Brief overall assessment (1-2 sentences)",
  "verdict": "SHIP",
  "comments": [
    {
      "file": "path/to/file.ts",
      "line": 42,
      "actions": ["comment"],
      "body": "Your review comment here (15-20 words MAX)"
    }
  ]
}
```

### Field Descriptions

- **summary**: High-level assessment of the PR
- **verdict**: One of:
  - `SHIP` = Good to merge
  - `FIX_THEN_SHIP` = Minor issues, fix then merge
  - `DONT_MERGE` = Significant issues blocking merge
- **comments**: Array of line-specific comments
  - **file**: Relative path to the file
  - **line**: Line number in the NEW version of the file (from the diff `+` lines)
  - **actions**: Array of actions:
    - `comment` = Leave a review comment
    - `edit` = Suggest this line needs editing
    - `close` = This addresses a previous comment
    - `reopen` = Previous fix was incomplete
  - **body**: The actual comment text. Be specific and actionable. 15-20 words MAX.

### Rules

**CRITICAL**: You are running in headless mode. No one can answer questions.

1. Only comment on lines that appear in the diff
2. Line numbers must match the NEW file version (+ lines in diff)
3. If no issues found, return empty comments array and verdict `SHIP`
4. Do NOT wrap the JSON in markdown code blocks
5. Respond with ONLY the JSON object, nothing else
