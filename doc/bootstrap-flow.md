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
- Source repository is checked out into `<projectPath>/.beer/original` before README inference.
- README/commit generation follows provider priority and fails fast if inference providers cannot produce output.
- `projectPath` comes from global CLI option `--project <path>` (default: invocation path).

## Checkout Path Resolution

```mermaid
flowchart TD
  A[Bootstrap starts] --> B{--project provided?}
  B -->|yes| C[Resolve projectPath from --project]
  B -->|no| D[Resolve projectPath from invocation path]
  C --> E[Create context with projectPath]
  D --> E
  E --> F[Resolve original checkout path as projectPath/.beer/original]
  F --> G[Clone source repo into that path]
```

## Bootstrap Logging

```mermaid
flowchart TD
  A[bootstrap_start] --> B[bootstrap_github_check]
  B --> C[bootstrap_settings_loaded]
  C --> D[bootstrap_settings_saved]
  D --> E[bootstrap_detected_providers]
  E --> F[bootstrap_source_selected]
  F --> G[bootstrap_publish_selected]
  G --> H[bootstrap_original_checkout_start]
  H --> I[bootstrap_original_checkout]
  I --> J[bootstrap_readme_generating]
  J --> K[bootstrap_readme_generated]
  K --> L[bootstrap_commit_generating]
  L --> M[bootstrap_commit_ready]
  M --> N[bootstrap_remote_ensuring]
  N --> O[bootstrap_commit_creating]
  O --> P[bootstrap_commit_created or bootstrap_no_changes]
  P --> Q[bootstrap_push_start]
  Q --> R[bootstrap_push_done]
```
