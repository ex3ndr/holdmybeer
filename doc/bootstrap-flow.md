# Bootstrap Flow

This document describes the initial `beer bootstrap` workflow used by holdmybeer.

## Sequence

```mermaid
flowchart TD
  A[Start bootstrap] --> B[Detect providers: claude/codex]
  B --> C[Write ~/Developer/HoldMyBeerDev/.beer/settings.json]
  C --> D[Prompt source repo input]
  D --> E[Parse owner/repo]
  E --> F[Validate source exists via gh]
  F --> G[Prompt publish owner + repo name]
  G --> H[Resolve collisions with -N suffix]
  H --> I{Repo exists?}
  I -->|No| J[Create repo via gh]
  I -->|Empty| K[Reuse empty repo]
  I -->|Non-empty| H
  J --> L[Checkout source to .beer/original]
  K --> L
  L --> M[Generate README via provider priority]
  M --> N[Generate initial commit message]
  N --> O[Update ~/Developer/HoldMyBeerDev/.beer/settings.json]
  O --> P[Ensure git origin remote]
  P --> Q[Commit]
  Q --> R[Push HEAD to main]
  R --> S[Done]
```

## Identity

```mermaid
flowchart LR
  A[Repository: holdmybeer] --> B[Workspace package: holdmybeer]
  B --> C[CLI binary: beer]
  C --> D[User command: beer bootstrap]
```

## Notes

- Source repository input accepts URL, SSH remote, or `owner/repo` shorthand.
- Publish repo defaults to `<source>-holdmybeer` and auto-suffixes when a non-empty repo already exists.
- Existing empty repository names are accepted and reused.
- Source repository is checked out into `.beer/original` before README inference.
- README/commit generation tries provider priority first, then uses deterministic fallback text.
