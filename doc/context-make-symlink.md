# Context Make Symlink

`Context` now includes `makeSymlink(target, linkPath)` for repository-scoped symlink creation.

```mermaid
flowchart TD
  A[ctx.makeSymlink(target, linkPath)] --> B[resolve absolute linkPath under project root]
  B --> C{linkPath exists?}
  C -->|no| F[create symlink]
  C -->|yes symlink| D[unlink existing symlink]
  D --> F[create symlink]
  C -->|yes non-symlink| E[symlink fails with EEXIST]
```
