# Workflow Index Registry

Workflow metadata and handlers are now centralized in `sources/_workflows/_index.ts`.

## Flow

```mermaid
flowchart LR
  A[bootstrapCommand] --> B[_workflows/_index.ts]
  C[ralphLoopCommand] --> B
  B --> D[workflowBootstrap title + run(ctx)]
  B --> E[workflowRalphLoop title + run(ctx)]
  D --> F[bootstrapWorkflow(ctx: Context)]
  E --> G[ralphLoopWorkflow(ctx: Context)]
```

## Notes

- Each workflow handler now has signature `run(ctx: Context)`.
- Command descriptions reuse workflow titles from the registry.
