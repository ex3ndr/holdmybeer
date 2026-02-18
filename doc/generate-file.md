# Generate File

`generateFile` now forces file-output mode through `generate` permissions.

## Flow

```mermaid
flowchart TD
  A[generateFile called] --> B[Resolve output file path]
  B --> C[Set expectedOutput=file path]
  C --> D[Set write-whitelist to file path]
  D --> E[Call generate]
  E --> F{File exists?}
  F -->|yes| G[Return inference result]
  F -->|no| H[Retry with missing-file reminder]
  H --> F
  F -->|still missing| I[Throw error]
```

## Rules

- `expectedOutput` is forced to `type=file` for the target file.
- `writePolicy` is forced to `write-whitelist` for the same file.
- Prompt still reiterates single-file write constraints.
- In file mode, `<output>` tags are not required from provider stdout.
