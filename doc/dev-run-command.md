# Dev Run Command

The repository now includes a predefined dev command:

- `bun run dev:run`

It runs the `beer` CLI from a fixed fixture project path.

```mermaid
flowchart LR
  A[bun run dev:run] --> B[beer --project ./fixtures/dev-source]
  B --> C[interactive workflow selection]
  C --> D[run selected workflow with fixture project]
```

## Paths

- Source fixture: `fixtures/dev-source`
