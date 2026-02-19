# Inference Step Progress

Inference workflow steps now require an explicit progress message, and `generate(...)` renders progress by default.

## Flow

```mermaid
flowchart TD
  A[step calls generate with progressMessage] --> B[validate non-empty message]
  B --> C{showProgress === false}
  C -->|yes| D[run inference without screen progress]
  C -->|no (default)| E[start ctx.progress line]
  E --> F[generate with same permissions]
  D --> F
  F -->|success| G[line done "✔"]
  F -->|error| H[line fail "❌"]
```

## Notes

- `generate(...)` requires `progressMessage` in options.
- Progress is enabled by default; callers only pass `showProgress: false` to disable it.
- Caller steps provide user-facing messages from `sources/text/all.txt`.
