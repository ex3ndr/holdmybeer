# Ralph Loop Workflow

This document describes the `beer ralph-loop` workflow implemented with built-in model inference.

## Sequence

```mermaid
flowchart TD
  A[beer ralph-loop] --> B[Ask: what should I build?]
  B --> C[Generate plan markdown]
  C --> D[Write plan to doc/plans/yyyyMMdd-slug.md]
  D --> E[Execute implementation from plan]
  E --> F[Review round 1]
  F --> G[Review round 2]
  G --> H[Review round 3]
  H --> I[Done]
```

## Notes

- All phases run through the project's built-in inference pipeline.
- Plan, execution, and reviews are fail-fast; provider errors fail the workflow.
- Execution and review rounds run with write-whitelist access scoped to the selected project path.
