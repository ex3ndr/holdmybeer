# Provider Generate Integration Tests

`providerGenerate.spec.ts` executes real `pi` CLI runs in sandboxed modes.

## Flow

```mermaid
flowchart TD
  A[providerGenerate.spec.ts] --> B[build read-only sandbox policy]
  A --> C[build write-whitelist sandbox policy]
  B --> D[run providerGenerate with real pi command]
  C --> E[run providerGenerate with real pi command]
  D --> F[assert output or non-flag parse failure]
  E --> G[assert output/file write or non-flag parse failure]
```

## Notes

- No mocks are used in this integration spec.
- Tests validate both text-return mode and file-write mode.
