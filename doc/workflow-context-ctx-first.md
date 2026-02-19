# Workflow Context Ctx-First

Workflow context now lives in `sources/_workflows/context/` and is passed explicitly as the first argument across workflows and step entrypoints.

## Flow

```mermaid
flowchart TD
  A[main.ts] --> B[contextInitialize(projectPath)]
  B --> C[workflow.run(ctx)]
  C --> D[bootstrap(ctx) or ralphLoopWorkflow(ctx)]
  D --> E[step(ctx, ...)]
  E --> F[runInference(ctx, ...)]
  F --> G[generate(ctx, prompt, permissions)]
```

## Notes

- Moved context code:
  - `sources/_workflows/context/contextTypes.ts`
  - `sources/_workflows/context/contextInitialize.ts`
  - `sources/_workflows/context/contextInitialize.spec.ts`
- Removed global context lookup (`contextGet`) usage from workflow steps.
- Updated step signatures to use `ctx` as first argument and derive `projectPath` from `ctx`.
