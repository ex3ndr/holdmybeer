# Bootstrap Workflow Log Removal

Removed workflow-level logging from the bootstrap orchestration.

## Flow

```mermaid
flowchart LR
  A[bootstrapCommand] --> B[_workflows/bootstrapWorkflow.ts]
  B --> C[settings + repo setup]
  C --> D[README generation]
  D --> E[commit generation]
  E --> F[pushMain]
```

## Notes

- `bootstrapWorkflow` no longer calls `beerLog`.
- Functional behavior of bootstrap steps remains unchanged.
