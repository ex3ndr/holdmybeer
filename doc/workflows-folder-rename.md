# Workflows Folder Rename

Workflow orchestration has been moved under `sources/_workflows` so the folder stays visually pinned at the top.

## Flow

```mermaid
flowchart LR
  A[sources/main.ts] --> B[workflow resolve + prompt]
  B --> C[_workflows/_index.ts]
  C --> D[_workflows/bootstrapWorkflow.ts]
  C --> E[_workflows/ralphLoopWorkflow.ts]
  D --> F[_workflows/steps/*]
  E --> F
```

## Notes

- Renamed folder: `sources/workflows` -> `sources/_workflows`
- Workflow entrypoints are selected from `sources/_workflows/_index.ts`.
