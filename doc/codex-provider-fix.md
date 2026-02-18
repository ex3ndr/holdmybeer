# Codex Provider Fix

Adjusted Codex inference execution to avoid nested sandbox transport failures.

## Flow

```mermaid
flowchart LR
  A[generate writePolicy] --> B[providerGenerate]
  B --> C{provider}
  C -->|claude| D[outer sandbox + claude -p]
  C -->|codex| E[codex exec --dangerously-bypass-approvals-and-sandbox]
  E --> F[no codex sandbox flags]
```

## Notes

- Codex now runs without codex-native sandbox flags.
- Claude still uses outer sandbox wrapping.
- macOS deny list no longer blocks `.config/gh` or `Library/Keychains` reads.
