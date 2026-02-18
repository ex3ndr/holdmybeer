# Rewrite Removal

The rewrite flow has been removed from the CLI.

## Changes

```mermaid
flowchart LR
  A[sources/main.ts] --> B[commands/bootstrapCommand.ts]
  B --> C[_workflows/bootstrapWorkflow.ts]
  C --> D[modules/*]
```

- Removed `sources/commands/rewriteCommand.ts`.
- Removed `sources/modules/rewrite/*`.
- Updated CLI description and command registration to bootstrap-only.
