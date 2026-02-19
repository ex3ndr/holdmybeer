# Context Gitignore Method

`Context` now includes a `gitignore(patterns)` method that ensures required patterns exist in repository `.gitignore`.

## Flow

```mermaid
flowchart TD
  A[ctx.gitignore(patterns)] --> B[read .gitignore or empty]
  B --> C[normalize existing lines]
  C --> D[compute missing patterns]
  D --> E{missing exists?}
  E -->|yes| F[append missing patterns]
  E -->|no| G[leave file unchanged]
```

## Notes

- Missing entries are appended in order.
- Existing slash/no-slash variants are treated as the same pattern.
- Bootstrap now uses `ctx.gitignore([".beer/local/"])`.
