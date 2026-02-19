# Bootstrap Rename

Renamed bootstrap workflow symbol and file to remove the suffix.

## Flow

```mermaid
flowchart LR
  A[_workflows/_index.ts] --> B[_workflows/bootstrap.ts]
  B --> C[export bootstrap(ctx)]
```

## Notes

- File rename: `sources/_workflows/bootstrapWorkflow.ts` -> `sources/_workflows/bootstrap.ts`
- Function rename: `bootstrapWorkflow(ctx)` -> `bootstrap(ctx)`
