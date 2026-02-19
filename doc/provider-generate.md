# Provider Generate

`providerGenerate` now executes inference through `pi` in JSON print mode.

## Flow

```mermaid
flowchart TD
  A[providerGenerate input] --> B[resolve session dir]
  B --> C[piProviderGenerate attempt 1]
  C --> D{output has tags?}
  D -->|yes| E[return extracted output]
  D -->|no| F[continue same session]
  F --> G[send retry error message only]
  G --> H[piProviderGenerate attempt 2 with --continue]
  H --> I{output has tags?}
  I -->|yes| E
  I -->|no| J[return failure]
```

## Notes

- Invocation uses `pi --mode json --print [--session-dir ...] [--model ...]`.
- Session dir is under `<projectPath>/.beer/local/sessions/<run-id>` where `projectPath` is the active context project path.
- Retry uses the same session dir and `--continue`, with only an explicit error message prompt.
- The selected model is passed from workflow model priority resolution.
- Sandbox execution remains enforced via the outer wrapper.
