# Bun Dev TTY Fix

Root dev scripts now run in the package cwd instead of workspace orchestration to preserve interactive terminal input for Inquirer prompts.

## Flow

```mermaid
flowchart LR
  A[bun dev] --> B[cd packages/holdmybeer && bun run dev]
  B --> C[bun sources/main.ts]
  C --> D[inquirer prompt with keyboard input]
```

## Notes

- `bun --workspaces run dev` printed prompt output but did not allow reliable key input.
- Direct package execution keeps stdin handling intact for workflow selection.
