# Context Launcher Initialize

Global context initialization now occurs only in the launcher before workflow execution.

## Flow

```mermaid
flowchart LR
  A[beer command] --> B[sources/main.ts]
  B --> C[contextInitialize(projectPath)]
  C --> D[workflow selector]
  D --> E[workflow run(ctx)]
  E --> F[steps call contextGet only]
```

## Notes

- Removed `contextGetOrInitialize` usage from workflow steps.
- `runInference` now reads global context via `contextGet()`.
- The init helper `contextGetOrInitialize.ts` was removed.
