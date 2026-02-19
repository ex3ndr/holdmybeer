# Pi Model Selection Profiles

Model selection now uses live model metadata from `pi` RPC and a profile-based scorer.

## Flow

```mermaid
flowchart TD
  A[providerDetect] --> B[providerModelsGet]
  B --> C[pi RPC get_available_models]
  C --> D[normalize model metadata]
  D --> E[generate permissions]
  E --> F{modelPriority provided?}
  F -->|yes| G[match explicit priority patterns]
  F -->|no or no match| H[score by mode]
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
