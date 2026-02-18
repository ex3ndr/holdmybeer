# Commit Workflow Step

Commit message generation now runs through workflow steps with global context.

## Flow

```mermaid
flowchart LR
  A[bootstrap workflow] --> B[generateCommit]
  B --> C[runInference]
  C --> D[generate]
  D --> E[provider inference]
  E --> F[single-line commit message]
```

## Notes

- Current location: `sources/workflows/steps/generateCommit.ts`
- Prompt placeholders resolve via `runInference` handlebars support.
- `bootstrap` imports `generateCommit` directly.
