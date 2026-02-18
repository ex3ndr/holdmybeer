# Workflow Steps Expansion

Added explicit workflow steps for inference, commit generation, and push orchestration.

## Flow

```mermaid
flowchart TD
  A[bootstrap] --> B[generateCommit]
  B --> C[runInference]
  C --> D[global context auto-load]
  C --> E[handlebars prompt resolve]
  C --> F[generate]
  A --> G[pushMain]
  G --> H[generateFile .gitignore]
  H --> I[LLM decides garbage ignore rules]
  G --> J[stageAndCommit]
  G --> K[gitPush origin/main]
```

## Notes

- New step files:
  - `sources/workflows/steps/runInference.ts`
  - `sources/workflows/steps/generateCommit.ts`
  - `sources/workflows/steps/pushMain.ts`
- Removed legacy step:
  - `sources/workflows/steps/generateCommitMessage.ts`
