# Inference Sandbox

Inference commands execute inside a per-call sandbox policy built at `inferText` time.

## Policy

- Library: `@anthropic-ai/sandbox-runtime`
- Network: unrestricted by sandbox (no `network` section configured)
- Filesystem writes are dynamic per call:
  - `read-only`: no writable paths
  - `write-whitelist`: only explicitly listed paths
- Provider auth state is always writable:
  - `~/.pi`
- Sensitive host paths are denied for both read and write

## Sequence

```mermaid
flowchart TD
  A[Context.inferText] --> B[Resolve writePolicy]
  B --> C[sandboxInferenceGet with writePolicy]
  C --> D[Build filesystem policy]
  D --> E[generateText/generateFile]
  E --> F[commandRun with sandbox]
  F --> G[sandbox.wrapCommand]
  G --> H[SandboxManager.wrapWithSandbox]
  H --> I[pi CLI execution]
```

## Notes

- Inference always runs sandboxed.
- The model runs in pi yolo mode; filesystem limits are still enforced by the outer sandbox.
- Prompt guards describe read-only behavior or an explicit write whitelist.
