# Workflow Steps Expansion

Added explicit workflow steps for inference, commit generation, and push orchestration.

## Flow

```mermaid
flowchart TD
  A[bootstrap] --> B[generateCommit]
  B --> C[runInference]
  C --> D[global context read]
  C --> E[handlebars prompt resolve]
  C --> F[generate]
  A --> G[generateReadme]
  G --> H[write README.md]
  H --> I[gitignoreEnsure]
  A --> J[pushMain]
  J --> K[stageAndCommit]
  J --> L[gitPush origin/main]
```

## Notes

- New step files:
  - `sources/_workflows/steps/runInference.ts`
  - `sources/_workflows/steps/generateCommit.ts`
  - `sources/_workflows/steps/pushMain.ts`
- Removed legacy step:
  - `sources/_workflows/steps/generateCommitMessage.ts`
