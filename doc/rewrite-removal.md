# Rewrite Removal

The rewrite flow has been removed from the CLI.

## Changes

```mermaid
flowchart LR
  A[sources/main.ts] --> B[workflow resolve + prompt]
  B --> C[_workflows/_index.ts]
  C --> D[_workflows/bootstrap.ts]
  D --> E[modules/*]
```

- Removed `sources/commands/rewriteCommand.ts`.
- Removed `sources/modules/rewrite/*`.
- Updated CLI to interactive workflow selection.
