# Workflow Index Registry

Workflow metadata and handlers are now centralized in `sources/_workflows/_index.ts`.

## Flow

```mermaid
flowchart LR
  A[sources/main.ts] --> B[workflow resolve + prompt]
  B --> C[_workflows/_index.ts]
  C --> D[workflowBootstrap title + run(ctx)]
  C --> E[workflowRalphLoop title + run(ctx)]
  D --> F[bootstrapWorkflow(ctx: Context)]
  E --> G[ralphLoopWorkflow(ctx: Context)]
```

## Notes

- Each workflow handler now has signature `run(ctx: Context)`.
- Workflow titles are sourced from the registry.
