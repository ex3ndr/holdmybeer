# Context Inference Flow

The CLI now initializes a global `Context` object once before command execution.

## Initialization

```mermaid
flowchart TD
  A[beer command starts] --> B[contextInitialize]
  B --> C[providerDetect probes claude/codex]
  C --> D[Create Context { providers, inferText }]
  D --> E[Store in globalThis.Context]
  E --> F[Command handlers use Context]
```

## Inference Routing

```mermaid
flowchart LR
  A[context.inferText input] --> B[providerPriority ids]
  B --> C[providerPriorityList resolves available providers]
  C --> D{Try provider command}
  D -->|success| E[Return provider + text]
  D -->|failure| F[Try next provider id]
  F --> D
  D -->|all fail| G[Return fallback text]
```

## Notes

- Inference now takes typed provider ids (`"claude" | "codex"`) per call.
- Provider fallback order is controlled by the explicit `providerPriority` array.
- Per-call visibility is supported with `showProgress: true` on `inferText`.
- `inferText` is forced into read-only provider execution and injects a non-modification prompt guard.
- Bootstrap persists detected providers to `~/Developer/HoldMyBeerDev/.beer/settings.json`, but inference no longer uses settings order directly.
