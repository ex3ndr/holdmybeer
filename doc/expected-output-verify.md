# Expected Output Verify Hook

Added optional `verify` callbacks to `generate` expected output types for both text and file modes.

## Flow

```mermaid
flowchart TD
  A[generate expectedOutput] --> B{verify provided?}
  B -->|no| C[providerGenerate returns output]
  B -->|yes| D[providerGenerate calls validateOutput]
  D --> E{verify throws?}
  E -->|no| C
  E -->|yes| F[forward error to model as retry prompt]
  F --> G[continue same session with --continue]
  G --> D
```

## Notes

- `expectedOutput.type = text` supports `verify({ text })`.
- `expectedOutput.type = file` supports `verify({ text, filePath, fileContent })`.
- `verify` may be synchronous or asynchronous.
- Verification failures are returned to the model as an error prompt and retried in the same provider session.
