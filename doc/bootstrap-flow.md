# Bootstrap Flow

This document describes the bootstrap workflow selected from `beer`.

## Sequence

```mermaid
flowchart TD
  A[Start bootstrap] --> B[Detect provider: pi]
  B --> C[Query live models via pi RPC]
  C --> D[Write <projectPath>/.beer/settings.json]
  D --> E[Prompt source repo input]
  E --> F[Parse owner/repo]
  F --> G[Validate source exists via gh]
  G --> H[Prompt publish owner + repo name]
  H --> I[Resolve collisions with -N suffix]
  I --> J{Repo exists?}
  J -->|No| K[Create repo via gh]
  J -->|Empty| L[Reuse empty repo]
  J -->|Non-empty| I
  K --> M[Checkout source to .beer/local/original]
  L --> M
  M --> N[Generate README via pi]
  N --> O[generateCommit step]
  O --> P[runInference step]
  P --> Q[Update settings]
  Q --> R[Ensure git origin remote]
  R --> S[pushMain step]
  S --> T[LLM updates .gitignore]
  T --> U[Commit]
  U --> V[Push HEAD to main]
```

## Notes

- Source input accepts URL, SSH remote, or `owner/repo` shorthand.
- Publish repo defaults to `<source>-holdmybeer` and auto-suffixes on non-empty collisions.
- Source is checked out to `<projectPath>/.beer/local/original` before inference.
- README and commit generation resolve workflow model priorities against live `pi` model availability.
- Push step updates `.gitignore` via inference before staging and commit.
- Inference failures fail the operation.
