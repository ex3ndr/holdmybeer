# Workflows Folder Rename

Workflow orchestration has been moved under `sources/_workflows` so the folder stays visually pinned at the top.

## Flow

```mermaid
flowchart LR
  A[commands/bootstrapCommand.ts] --> B[_workflows/bootstrapWorkflow.ts]
  C[commands/ralphLoopCommand.ts] --> D[_workflows/ralphLoopWorkflow.ts]
  B --> E[_workflows/steps/*]
  D --> E
```

## Notes

- Renamed folder: `sources/workflows` -> `sources/_workflows`
- `bootstrap` command now imports a workflow entrypoint, same pattern as `ralph-loop`.
