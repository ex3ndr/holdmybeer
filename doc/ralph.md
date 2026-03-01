# Ralph Workflow

This document describes the `ralph` workflow selected from `beer`.

## Sequence

```mermaid
flowchart TD
  A[Select ralph workflow] --> B[Prompt for build goal]
  B --> C[Opus planning session]
  C --> D{Questions returned?}
  D -->|Yes| E[Ask user answers]
  E --> C
  D -->|No| F[Ask user to approve plan]
  F -->|No| G[Collect feedback]
  G --> C
  F -->|Yes| H[Write plan to doc/plans/yyyyMMdd-slug.md]
  H --> I[Execute plan with Codex xhigh]
  I --> J[Review loop with Codex high]
  J --> K{<no-issues/> or 10 rounds?}
  K -->|No| J
  K -->|Yes| L[Done]
```

## Notes

- Planning runs in read-only mode.
- Execution and review run in write-whitelist mode scoped to the project path.
- The review loop stops early on `<no-issues/>` and has a hard cap of 10 rounds.
