# Provider Generate

`providerGenerate` now executes inference through `pi` in JSON print mode.

## Flow

```mermaid
flowchart TD
  A[providerGenerate input] --> B[resolve pi args]
  B --> C[commandRun with sandbox wrapper]
  C --> D{exit code 0?}
  D -->|no| E[return failure]
  D -->|yes| F[parse pi JSON events]
  F --> G[extract assistant message_end text]
  G --> H{output tags required?}
  H -->|no| I[return text]
  H -->|yes| J{tags present?}
  J -->|yes| K[return extracted output]
  J -->|no| L[retry once with output reminder]
  L --> M{tags present?}
  M -->|yes| K
  M -->|no| E
```

## Notes

- Invocation uses `pi --mode json --print --no-session [--model ...]`.
- The selected model is passed from workflow model priority resolution.
- Sandbox execution remains enforced via the outer wrapper.
