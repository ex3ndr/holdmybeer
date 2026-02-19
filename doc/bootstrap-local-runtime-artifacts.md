# Bootstrap local runtime artifacts and gitignore

Bootstrap now guarantees a root `.gitignore` exists and includes `.beer/local/` during README materialization, before the first commit.

All local-only runtime artifacts are grouped under `.beer/local/`:
- Source checkout: `.beer/local/original`
- Log files: `.beer/local/logs/beer-YYYY-MM-DD.log`

```mermaid
flowchart TD
  A[Bootstrap writes README.md] --> B[Bootstrap ensures .gitignore]
  B --> C[Create or update .gitignore]
  C --> D[Ensure .beer/local/ ignored]
  D --> E[First commit includes README + .gitignore]
  E --> I[Push main]

  F[Runtime artifacts] --> G[.beer/local/original]
  F --> H[.beer/local/logs]
```
