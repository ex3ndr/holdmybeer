# Bootstrap Flow

This document describes the initial `daycare bootstrap` workflow used by holdmybeer.

## Sequence

```mermaid
flowchart TD
  A[Start bootstrap] --> B[Detect providers: claude/codex]
  B --> C[Write .beer/settings.json]
  C --> D[Prompt source repo input]
  D --> E[Parse owner/repo]
  E --> F[Validate source exists via gh]
  F --> G[Prompt publish owner + repo name]
  G --> H[Resolve collisions with -N suffix]
  H --> I{Repo exists?}
  I -->|No| J[Create repo via gh]
  I -->|Empty| K[Reuse empty repo]
  I -->|Non-empty| H
  J --> L[Generate README via provider priority]
  K --> L
  L --> M[Generate initial commit message]
  M --> N[Update .beer/settings.json]
  N --> O[Ensure git origin remote]
  O --> P[Commit]
  P --> Q[Push HEAD to main]
  Q --> R[Done]
```

## Notes

- Source repository input accepts URL, SSH remote, or `owner/repo` shorthand.
- Publish repo defaults to `<source>-holdmybeer` and auto-suffixes when a non-empty repo already exists.
- Existing empty repository names are accepted and reused.
- README/commit generation tries provider priority first, then uses deterministic fallback text.
