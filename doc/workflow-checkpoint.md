# Checkpoint Workflow

Adds a `checkpoint` workflow that creates a commit and pushes to `origin/main` using an optional user-provided commit message.

## Flow

```mermaid
flowchart TD
  A[user selects checkpoint workflow] --> B[prompt optional checkpoint hint]
  B --> C{hint provided?}
  C -->|yes| D[ctx.checkpoint(hint, remote=origin, branch=main)]
  C -->|no| E[ctx.checkpoint(undefined, remote=origin, branch=main)]
  D --> F[stage commit and push]
  E --> F
```

## Notes

- Workflow id: `checkpoint`.
- Uses direct git checkpoint behavior from `Context`.
- No inference step is involved.
