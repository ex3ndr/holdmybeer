# Workflow Resolution In Main

Workflow selection and bootstrap gating now happen in `sources/main.ts`.

## Flow

```mermaid
flowchart TD
  A[beer --project <path>] --> B[sources/main.ts]
  B --> C[mainWorkflowBootstrappedResolve]
  C --> D[@inquirer/select choices]
  D --> E[_workflows/_index.ts]
  E --> F[workflow.run(ctx)]
```

## Notes

- `_workflows` now contains workflow entrypoints/steps and the `_index.ts` registry only.
- Non-bootstrap workflows remain disabled until bootstrap settings are complete.
