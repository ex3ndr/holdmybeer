# Pi Model Selection Profiles

Model selection now uses hardcoded static model priority lists and picks the first available model for each profile.

## Flow

```mermaid
flowchart TD
  A[providerDetect] --> B[providerModelsGet]
  B --> C[pi RPC get_available_models]
  C --> D[cross-check available model ids]
  D --> E[generate permissions]
  E --> F{modelPriority provided?}
  F -->|yes| G[match explicit priority patterns]
  F -->|no or no match| H[use static profile priority list]
  H --> I{profile}
  I -->|sonnet| J[prefer sonnet models]
  I -->|opus| K[prefer opus models]
  I -->|codex-high| L[prefer codex high-capability models]
  I -->|codex-xhigh| N[prefer codex maximum-capability models]
  J --> M[selected model id]
  K --> M
  L --> M
  N --> M
  G --> M
```

## Notes

- `generateReadme` uses `modelSelectionMode: "sonnet"`.
- `generateCommit` uses `modelSelectionMode: "codex-high"`.
- Explicit `modelPriority` still works and takes precedence.
- When no profile candidate is available, selection falls back to the first available model from the static global catalog.
