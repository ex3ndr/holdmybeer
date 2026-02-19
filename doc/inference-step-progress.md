# Inference Step Progress

Inference workflow steps now require an explicit progress message and render a single-character ASCII spinner on screen while inference runs.

## Flow

```mermaid
flowchart TD
  A[step calls runInference with progressMessage] --> B[validate non-empty message]
  B --> C{showProgress}
  C -->|true| D[start stepProgressStart spinner]
  C -->|false| E[skip spinner]
  D --> F[generate with same permissions]
  E --> F
  F -->|success| G[spinner done "*"]
  F -->|error| H[spinner fail "x"]
```

## Notes

- `runInference` now requires `progressMessage` in options.
- Caller steps provide user-facing messages from `sources/text/all.txt`.
- Spinner output is screen-only and separate from `.beer/logs/*` file logging.
