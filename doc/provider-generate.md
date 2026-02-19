# Provider Generate

`providerGenerate` now executes inference through `pi` in JSON print mode.

## Flow

```mermaid
flowchart TD
  A[providerGenerate input] --> B[piProviderGenerate attempt 1]
  B --> C[capture session id from PI session event]
  C --> D{output has tags?}
  D -->|yes| E[return extracted output + session id]
  D -->|no| F[retry prompt]
  F --> G{have session id?}
  G -->|yes| H[attempt 2 with --session <id>]
  G -->|no| I[attempt 2 from scratch]
  H --> J{output has tags?}
  I --> J
  J -->|yes| E
  J -->|no| K[return failure]
```

## Notes

- Invocation uses `pi --mode json --print [--session <id>] [--model ...]`.
- Session id is extracted from PI JSON session events (`id`/`sessionId`).
- Retry resumes using `--session <id>` when available; otherwise it starts a fresh call.
- The selected model is passed from workflow model priority resolution.
- Sandbox execution remains enforced via the outer wrapper.
