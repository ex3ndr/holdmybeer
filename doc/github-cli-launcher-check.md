# GitHub CLI Launcher Check

GitHub CLI validation now runs in the CLI launcher before workflow selection.

## Flow

```mermaid
flowchart LR
  A[beer command] --> B[sources/main.ts]
  B --> C[githubCliEnsure]
  C --> D[context initialize]
  D --> E[workflow selector]
  E --> F[selected workflow run]
```

## Notes

- `githubCliEnsure` was removed from `bootstrapWorkflow`.
- The precheck now fails fast before any workflow prompt is shown.
