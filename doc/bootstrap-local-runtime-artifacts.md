# Bootstrap local runtime artifacts and gitignore

Bootstrap now guarantees a root `.gitignore` exists and includes `.beer/local/`.

All local-only runtime artifacts are grouped under `.beer/local/`:
- Source checkout: `.beer/local/original`
- Log files: `.beer/local/logs/beer-YYYY-MM-DD.log`

```mermaid
flowchart TD
  A[Bootstrap writes README.md] --> B[gitignoreEnsure project root]
  B --> C[Create or update .gitignore]
  C --> D[Ensure .beer/local/ ignored]
  D --> E[Stage commit and push]

  F[Runtime artifacts] --> G[.beer/local/original]
  F --> H[.beer/local/logs]
```
