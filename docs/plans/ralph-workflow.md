# Ralph Workflow

## Overview
- New workflow that orchestrates three phases: **plan** (Claude Opus), **execute** (Codex xhigh), **review** (Codex high with auto-stop)
- Planning uses Opus for high-quality reasoning — generates a plan + questions in one call, user answers, Opus refines until user approves
- Implementation uses Codex xhigh (strongest code model) for single-shot execution of the finalized plan
- Review uses Codex high in a loop — reviews implementation, applies fixes, re-reviews until it declares "no issues found"
- Saves the plan to `doc/plans/` like existing ralph-loop workflow
- Registered as a new workflow in `_index.ts` with id `"ralph"`

## Context (from discovery)
- Existing `ralphLoopWorkflow` provides the baseline pattern: goal → plan → execute → review(3x)
- `generate` step handles template substitution + progress reporting
- `generateSessionCreate` / `generatePureSessionCreate` provide stateful sessions (sessionId carries across calls) — needed for multi-turn planning
- `providerModelSelect` supports `"opus"`, `"codex-xhigh"`, `"codex-high"` modes
- `promptInput` from `modules/prompt/promptInput.ts` handles terminal user input
- Write policy: planning is `read-only`, execution and review are `write-whitelist`
- Text catalog entries go in `sources/text/all.txt`

## Development Approach
- **Testing approach**: Regular (code first, then tests)
- Complete each task fully before moving to the next
- Make small, focused changes
- **CRITICAL: every task MUST include new/updated tests** for code changes in that task
- **CRITICAL: all tests must pass before starting next task**
- **CRITICAL: update this plan file when scope changes during implementation**
- Run tests after each change
- Maintain backward compatibility

## Testing Strategy
- **Unit tests**: required for every task (see Development Approach above)
- Note: do not unit test workflows and steps per CLAUDE.md — only test pure helper functions

## Progress Tracking
- ➕ Added `ralph_plan_feedback_prompt` text key to support required reject-and-refine feedback capture without hardcoded user-facing strings.
- Mark completed items with `[x]` immediately when done
- Add newly discovered tasks with ➕ prefix
- Document issues/blockers with ⚠️ prefix
- Update plan if implementation deviates from original scope
- Keep plan in sync with actual work done

## Implementation Steps

### Task 1: Add text catalog entries for ralph workflow
- [x] Add text entries to `sources/text/all.txt`:
  - `prompt_ralph_goal` — "What should I build?" prompt
  - `error_ralph_goal_required` — error when goal is blank
  - `inference_ralph_planning` — progress message for planning phase
  - `inference_ralph_plan_refining` — progress message for plan refinement round
  - `inference_ralph_executing` — progress message for execution phase
  - `inference_ralph_reviewing` — progress message for review phase
  - `workflow_ralph_title` — workflow title for registry display
  - `ralph_plan_questions_prompt` — prompt asking user to answer questions
  - `ralph_plan_approve_prompt` — prompt asking user to approve/reject plan
- [x] Run `bun run lint:fix` to verify text file parses correctly
- [x] Run tests — must pass before next task

### Task 2: Create `ralphPlanPathResolve.ts`
- [x] Create `sources/_workflows/steps/ralphPlanPathResolve.ts`
- [x] Reuse same pattern as `ralphLoopPlanPathResolve` — date + slugified goal → `doc/plans/{date}-{slug}.md`
- [x] Write tests for slug generation (special chars, empty input, long input)
- [x] Run tests — must pass before next task

### Task 3: Create `ralphPlan.ts` — planning step with Opus + interactive Q&A
- [x] Create `sources/_workflows/steps/ralphPlan.ts`
- [x] Use `generateSessionCreate` to create a session with `modelSelectionMode: "opus"` and `writePolicy: { mode: "read-only" }`
- [x] **First call**: send prompt with build goal asking Opus to produce a markdown implementation plan AND a list of clarifying questions (if any) in a structured format — plan in `<plan>` tags, questions in `<questions>` tags
- [x] **Parse response**: extract plan text and questions list
- [x] **If questions exist**: display questions to user, collect answers via `promptInput`, send answers back to Opus session asking it to refine the plan
- [x] **Loop**: repeat parse → ask → refine until Opus returns no questions
- [x] **Approval prompt**: show final plan summary, ask user "Approve this plan? (y/n)" via `promptInput`
  - If rejected: ask user for feedback via `promptInput`, send feedback to Opus session, loop back to refinement
  - If approved: write plan to disk at resolved path
- [x] Return `{ planPath, text }` matching existing pattern
- [x] Run tests — must pass before next task

### Task 4: Create `ralphExecute.ts` — implementation step with Codex xhigh
- [x] Create `sources/_workflows/steps/ralphExecute.ts`
- [x] Read finalized plan from disk
- [x] Use `generate` step with `modelSelectionMode: "codex-xhigh"` and `writePolicy: { mode: "write-whitelist", writablePaths: [projectPath] }`
- [x] Prompt instructs Codex to implement the plan exactly, run tests/typechecks, and summarize changes
- [x] Return `{ provider, sessionId, text }` matching existing pattern
- [x] Run tests — must pass before next task

### Task 5: Create `ralphReview.ts` — review step with Codex high auto-stop loop
- [x] Create `sources/_workflows/steps/ralphReview.ts`
- [x] Use `generateSessionCreate` to create a session with `modelSelectionMode: "codex-high"` and `writePolicy: { mode: "write-whitelist", writablePaths: [projectPath] }`
- [x] **First call**: send prompt asking Codex to review the implementation against the plan, find bugs/regressions/missing tests, apply fixes, run tests
- [x] **Parse response**: check if Codex declares "no issues found" (look for `<no-issues/>` tag in output)
- [x] **Loop**: if issues were found and fixed, send follow-up prompt asking Codex to re-review after its fixes
- [x] **Safety cap**: stop after max 10 rounds regardless (prevent infinite loops)
- [x] Return `{ rounds, text }` with final review summary
- [x] Run tests — must pass before next task

### Task 6: Create `ralphWorkflow.ts` — workflow orchestrator
- [x] Create `sources/_workflows/ralphWorkflow.ts`
- [x] Prompt for build goal via `promptInput`
- [x] Call `ralphPlan` (Opus planning with Q&A)
- [x] Call `ralphExecute` (Codex xhigh implementation)
- [x] Call `ralphReview` (Codex high review loop)
- [x] Run tests — must pass before next task

### Task 7: Register workflow in `_index.ts`
- [x] Add `ralphWorkflow` import and `workflowRalph` export to `sources/_workflows/_index.ts`
- [x] Add to `workflows` array with id `"ralph"` and title from text catalog
- [x] Run `bun run lint:fix`
- [x] Run tests — must pass before next task

### Task 8: Verify acceptance criteria
- [x] Verify all workflow phases use correct models: opus → codex-xhigh → codex-high
- [x] Verify planning Q&A loop works (questions → answers → refine → approve)
- [x] Verify review loop auto-stops on "no issues found"
- [x] Verify review loop has safety cap (max 10 rounds)
- [x] Run full test suite (`bun run test`)
- [x] Run linter (`bun run lint`)
- [x] Run typecheck (`bun run typecheck`)

### Task 9: [Final] Update documentation
- [x] Add doc file `doc/ralph.md` with mermaid diagram showing the workflow phases and decision points

## Technical Details

### Planning Phase Protocol
```
User provides goal
  → Opus generates plan + questions
    → If questions: display to user, collect answers, send back
    → If no questions: show plan for approval
      → If rejected: collect feedback, refine
      → If approved: save to disk
```

Response format for planning inference:
```
<plan>
# Implementation Plan
...markdown content...
</plan>

<questions>
1. Question about scope?
2. Question about approach?
</questions>
```

When no questions remain, Opus returns only `<plan>` tags.

### Review Phase Protocol
```
Codex reviews implementation
  → Finds issues → applies fixes → re-reviews
  → No issues found → returns <no-issues/> → loop stops
  → Max 10 rounds → loop stops
```

### File Layout
```
_workflows/
  ralphWorkflow.ts              # orchestrator
  steps/
    ralphPlan.ts                # Opus planning with Q&A
    ralphPlanPathResolve.ts     # plan file path resolution
    ralphExecute.ts             # Codex xhigh implementation
    ralphReview.ts              # Codex high review loop
```

## Post-Completion

**Manual verification:**
- Run workflow end-to-end with a real build goal to verify all three phases work
- Verify Opus plan quality and Q&A flow
- Verify Codex actually applies code changes
- Verify review loop terminates correctly
