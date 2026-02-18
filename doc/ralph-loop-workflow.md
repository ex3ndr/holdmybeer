# Ralph Loop Workflow

This document describes the `ralph-loop` workflow selected from `beer`, implemented with built-in model inference.

## Sequence

```mermaid
flowchart TD
  A[beer workflow picker] --> B[Select ralph-loop]
  B --> C[Ask: what should I build?]
  C --> D[Generate plan markdown]
  D --> E[Write plan to doc/plans/yyyyMMdd-slug.md]
  E --> F[Execute implementation from plan]
  F --> G[Review round 1]
  G --> H[Review round 2]
  H --> I[Review round 3]
  I --> J[Done]
```

## Notes

- All phases run through the project's built-in inference pipeline.
- Plan, execution, and reviews are fail-fast; provider errors fail the workflow.
- Execution and review rounds run with write-whitelist access scoped to the selected project path.
- Workflow entrypoint: `sources/_workflows/ralphLoopWorkflow.ts`.
