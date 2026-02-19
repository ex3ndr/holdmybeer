# Provider CLI JSONL Wrapper

`providerGenerate` now delegates PI CLI execution to provider-specific wrappers in `modules/ai/providers/`.

## Flow

```mermaid
flowchart TD
  A[providerGenerate] --> B[piProviderGenerate]
  B --> C[commandJSONL]
  C --> D[sandbox wrapCommand]
  D --> E[spawn CLI]
  E --> F[stream stdout/stderr]
  F --> G[parse stdout as JSONL]
  G --> H{malformed line?}
  H -->|yes| I[ignore line]
  H -->|no| J[onJsonlEvent(event)]
  J --> K[piProviderGenerate forwards raw event]
  K --> L[providerGenerate maps to vendor-agnostic event]
  L --> M[emit session/thinking/tool/text callbacks]
  M --> N[PI parse message_end assistant text]
  N --> O[return output/failure]
```

## Notes

- `commandJSONL` accepts `abortSignal` on input and forwards it into sandbox command wrapping.
- JSONL parsing ignores malformed lines and keeps streaming.
- `providerGenerate` now emits vendor-agnostic events:
  - `session_started`
  - `thinking_start` / `thinking_delta` / `thinking_stop`
  - `tool_call_start` / `tool_call_stop`
  - `text_start` / `text_delta` / `text_stop`
- `providerGenerate` and `generate` results now include `sessionId` when a provider session event is observed.
- Retry stays in the same PI session by reusing one `.beer/local/sessions/<run-id>` directory and sending `--continue` with an explicit error message prompt.
