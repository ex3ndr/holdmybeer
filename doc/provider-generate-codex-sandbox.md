# ProviderGenerate Codex Sandbox Mode

## Summary
- `providerGenerate` now disables the outer wrapper sandbox for `codex`.
- `claude` still runs through the provided wrapper sandbox.
- `codex` keeps using `--dangerously-bypass-approvals-and-sandbox`.

## Flow
```mermaid
flowchart TD
  A[providerGenerate input] --> B{providerId}
  B -->|codex| C[sandbox = undefined]
  B -->|claude| D[sandbox = input.sandbox]
  C --> E[commandRun]
  D --> E
```
