# Inference Provider Tests

Inference integration tests now validate real `pi` CLI execution (no mocks).

## Flow

```mermaid
flowchart TD
  A[generate/providerGenerate tests] --> B[run real pi command]
  B --> C{success?}
  C -->|yes| D[assert output and provider id]
  C -->|no| E[assert no json-mode flag parse errors]
```

## Coverage

- `generate.spec.ts` validates end-to-end `generate()` execution through `pi`.
- `providerGenerate.spec.ts` validates read-only and single-file write-whitelist modes.
- Failure assertions verify errors are not caused by unsupported `pi` flags.
