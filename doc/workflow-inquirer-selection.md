# Workflow Inquirer Selection

The CLI root command now opens an interactive workflow selector and runs workflows from the registry.

## Flow

```mermaid
flowchart TD
  A[beer] --> B[sources/main.ts]
  B --> C[mainWorkflowBootstrappedResolve]
  C --> D{bootstrapped?}
  D -->|no| E[disable non-bootstrap choices]
  D -->|yes| F[all workflows enabled]
  E --> G[user selects workflow]
  F --> G
  G --> H[_workflows/_index.ts run(ctx)]
```

## Notes

- Workflow list is sourced from `sources/_workflows/_index.ts`.
- Non-bootstrap workflows are disabled until bootstrap settings are complete.
