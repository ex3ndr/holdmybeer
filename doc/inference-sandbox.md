# Inference Sandbox

Inference commands now execute inside a shared sandbox instance created once at context initialization.

## Policy

- Library: `@anthropic-ai/sandbox-runtime` (latest)
- Network: unrestricted by sandbox (no `network` section configured)
- Filesystem writes: only project directory
- `.beer` subtree: explicitly denied for writes (read-only)

## Sequence

```mermaid
flowchart TD
  A[contextInitialize] --> B[sandboxInferenceGet]
  B --> C[Context.inferText]
  C --> D[aiTextGenerate]
  D --> E[commandRun with sandbox]
  E --> F[sandbox.wrapCommand]
  F --> G[SandboxManager.wrapWithSandbox]
  G --> H[provider CLI execution]
```

## Notes

- The sandbox is reused across all `inferText` calls.
- Read-only inference prompt guard is still applied before provider invocation.
- Provider-specific read-only flags are still used (`--tools ""`, `--sandbox read-only`).
