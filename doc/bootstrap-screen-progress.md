# Bootstrap Screen Progress

Bootstrap now renders user-visible single-character progress while long operations run, so workflow execution is visible even when logs are file-only.

## Flow

```mermaid
flowchart TD
  A[select bootstrap workflow] --> B[resolve settings and repos]
  B --> C[spinner: checkout source repository]
  C --> D[spinner: generate README]
  D --> E[spinner: generate commit message]
  E --> F[spinner: ensure remote and push main]
  F --> G[complete]
```

## Notes

- Progress is rendered with `stepProgressStart` and appears on screen only.
- Detailed logs remain in `.beer/logs/beer-YYYY-MM-DD.log`.
