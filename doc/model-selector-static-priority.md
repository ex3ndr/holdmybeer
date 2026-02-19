# Model Selector Static Priority

Model selection now relies on hardcoded model ids and static per-profile priority lists, then cross-checks them against provider-reported available models.

## Flow

```mermaid
flowchart TD
  A[providerModelSelect input] --> B{modelPriority provided?}
  B -->|yes| C[match requested priorities against available model ids]
  C -->|match found| D[select first match]
  C -->|no match| E[profile static priority list]
  B -->|no| E
  E --> F[scan hardcoded ids in order]
  F -->|match found| D
  F -->|none| G[scan global hardcoded catalog]
  G -->|match found| D
  G -->|none| H[fallback to first available id sorted]
```

## Notes

- Profiles: `sonnet`, `opus`, `codex-high`, `codex-xhigh`.
- Static model ids are sourced from known provider catalog entries and checked against real availability.
