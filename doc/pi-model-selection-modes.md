# Pi Model Selection Modes

Model selection now uses live model metadata from `pi` RPC and a mode-based scorer.

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
  H --> I{mode}
  I -->|quality| J[prefer higher-capability models]
  I -->|fast| K[prefer lighter models]
  I -->|balanced| L[prefer broad capacity]
  J --> M[selected model id]
  K --> M
  L --> M
  G --> M
```

## Notes

- `aiReadmeGenerate` uses `modelSelectionMode: "quality"`.
- `generateCommitMessage` uses `modelSelectionMode: "fast"`.
- Explicit `modelPriority` still works and takes precedence.
