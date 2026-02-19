# Bootstrap Git Repo Init

Bootstrap now ensures the target project directory is an initialized git repository before configuring remotes and pushing.

## Flow

```mermaid
flowchart TD
  A[bootstrap workflow] --> B[generate README and commit message]
  B --> C[gitRepoEnsure on project path]
  C --> D{is git repo?}
  D -->|yes| E[continue]
  D -->|no| F[git init]
  F --> E
  E --> G[gitRemoteEnsure origin]
  G --> H[pushMain commit and push]
```

## Notes

- Added `sources/modules/git/gitRepoEnsure.ts`.
- Bootstrap calls `gitRepoEnsure` before remote setup.
- Prevents `fatal: not a git repository` during bootstrap push flow.
