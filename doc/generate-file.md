# Generate File

Added `generateFile` to drive inference that should write to exactly one file.

## Flow

```mermaid
flowchart TD
  A[generateFile called] --> B[Resolve output file path]
  B --> C[Build prompt with single-file write rule]
  C --> D[Call generate with write-whitelist policy]
  D --> E{File exists?}
  E -->|yes| F[Return inference result]
  E -->|no| G[Retry with missing-file reminder]
  G --> E
  E -->|still no after retries| H[Throw error]
```

## Rules

- Prompt explicitly says to write only to one file.
- Sandbox `writePolicy` whitelists only that file path.
- Retries if inference completed but file did not appear.
