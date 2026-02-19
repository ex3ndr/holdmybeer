# Generate File

`generateFile` now forces file-output mode through `generate` permissions.

## Flow

```mermaid
flowchart TD
  A[generateFile called] --> B[Resolve output file path]
  B --> C[Create parent directories for output path]
  C --> D[Set expectedOutput=file path]
  D --> E[Set write-whitelist to file path]
  E --> F[Call generate]
  F --> G{File exists?}
  G -->|yes| H[Return inference result]
  G -->|no| I[Retry with missing-file reminder]
  I --> G
  G -->|still missing| J[Throw error]
```

## Rules

- `generateFile` creates parent directories for the target path before inference starts.
- `expectedOutput` is forced to `type=file` for the target file.
- `writePolicy` is forced to `write-whitelist` for the same file.
- Prompt still reiterates single-file write constraints.
- In file mode, `<output>` tags are not required from provider stdout.
