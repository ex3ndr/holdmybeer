# Subcommands Removal

Removed direct CLI subcommands and kept a single interactive entrypoint.

## Flow

```mermaid
flowchart LR
  A[beer --project <path>] --> B[sources/main.ts action]
  B --> C[workflow resolve + prompt]
  C --> D[_workflows/_index.ts]
  D --> E[selected workflow run(ctx)]
```

## Notes

- Removed command files:
  - `sources/commands/bootstrapCommand.ts`
  - `sources/commands/ralphLoopCommand.ts`
- CLI now routes only through interactive workflow selection.
