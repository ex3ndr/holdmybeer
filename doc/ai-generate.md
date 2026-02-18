# AI Generate Function

Updated `generate` to shape prompts with explicit sandbox context and explicit output expectations.

## Flow

```mermaid
flowchart LR
  A[Caller prompt] --> B[generate]
  B --> C[prepend sandbox parameters]
  C --> D[append expected output rules text or file]
  D --> E[providerPriorityList]
  E --> F[providerGenerate]
  F --> G[extract output tags]
  G --> H[GenerateResult]
```

## Notes

- `generate` now prepends current sandbox details (`read-only` or `write-whitelist`).
- `generate` appends expected output instructions (`text` or `file`).
- `expectedOutput` defaults to `text` when omitted.
- `generate` delegates provider invocation to `providerGenerate`.
