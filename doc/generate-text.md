# Generate Text

Restored `generateText` as a shortcut wrapper around `generate`.

## Flow

```mermaid
flowchart LR
  A[generateText] --> B[forward prompt and permissions]
  B --> C[set expectedOutput=text]
  C --> D[call generate]
  D --> E[GenerateResult]
```

## Notes

- `generateText` intentionally constrains `expectedOutput` to `text`.
- Caller-supplied provider/write policies still pass through.
