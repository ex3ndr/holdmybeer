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
  M --> N{README.md exists?}
  N -->|No| O[Generate README via pi]
  O --> P[Write README.md]
  N -->|Yes| Q[Keep existing README.md]
  P --> R[Ensure root .gitignore includes .beer/local/]
  Q --> R
  R --> S[generateCommit step]
  S --> T[runInference step]
  T --> U[Update settings]
  U --> V[Ensure git origin remote]
  V --> W[pushMain step]
  W --> X[Commit]
  X --> Y[Push HEAD to main]
```

## Notes

- Source input accepts URL, SSH remote, or `owner/repo` shorthand.
- Publish repo defaults to `<source>-holdmybeer` and auto-suffixes on non-empty collisions.
- Source is checked out to `<projectPath>/.beer/local/original` before inference.
- Bootstrap skips README inference when `README.md` already exists.
- Bootstrap creates/updates root `.gitignore` in the README phase before the first commit.
- README and commit generation resolve workflow model priorities against live `pi` model availability.
- Inference failures fail the operation.
