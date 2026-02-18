# Bootstrap Workflow Log Removal

Removed workflow-level logging from the bootstrap orchestration.

## Flow

```mermaid
flowchart LR
  A[sources/main.ts] --> B[_workflows/workflowRunInteractive.ts]
  B --> C[_workflows/_index.ts]
  C --> D[_workflows/bootstrapWorkflow.ts]
  D --> E[settings + repo setup]
  E --> F[README generation]
  F --> G[commit generation]
  G --> H[pushMain]
```

## Notes

- `bootstrapWorkflow` no longer calls `beerLog`.
- Functional behavior of bootstrap steps remains unchanged.
