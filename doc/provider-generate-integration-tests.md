# Provider Generate Integration Tests

Reworked `providerGenerate.spec.ts` to use real provider CLI execution with sandbox policies.

## Flow

```mermaid
flowchart TD
  A[providerGenerate.spec.ts] --> B[build sandboxInferenceGet read-only]
  A --> C[build sandboxInferenceGet write-whitelist one file]
  B --> D[run providerGenerate with real claude/codex command]
  C --> E[run providerGenerate with real claude/codex command]
  D --> F[assert output or provider flag compatibility]
  E --> G[assert output/file write or provider flag compatibility]
```

## Notes

- No mocks are used in `providerGenerate.spec.ts`.
- Tests execute real provider CLIs in sandboxed modes.
