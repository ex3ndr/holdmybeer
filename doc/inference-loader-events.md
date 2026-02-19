# Inference Loader Events

Inference progress now stays in the built-in single-line loader and is updated as provider events arrive, without printing raw event lines to the terminal.

## Flow

```mermaid
flowchart TD
  A[runInference starts loader with initial message] --> B[generate starts provider run]
  B --> C[provider emits stdout/stderr events]
  C --> D[generate emits compact event labels]
  D --> E[runInference updates loader message]
  E --> F{provider result}
  F -->|success| G[loader done "*"]
  F -->|failure| H[loader fail "x"]
```

## Notes

- Provider inference execution timeout is disabled (`timeoutMs: null`).
- Inference event details continue to be logged to `.beer/local/logs/*`.
- Terminal output remains a single loader line that refreshes on incoming events.
- Loader updates use human-readable event text (for example, `PI turn started`) instead of raw token payloads.
- Message events are parsed too, including role-aware labels like `PI assistant message started`.
