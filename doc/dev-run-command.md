# Dev Run Command

The repository now includes a predefined dev command:

- `yarn dev:run`

It runs the `beer` CLI rewrite flow against a fixed fixture source folder.

```mermaid
flowchart LR
  A[yarn dev:run] --> B[beer rewrite ./fixtures/dev-source]
  B --> C[apply baseline rewrite]
  C --> D[write output to .context/dev-output]
```

## Paths

- Source fixture: `fixtures/dev-source`
- Output folder: `.context/dev-output`
