# Pi JSON Output Strictness

Inference output parsing now enforces JSON assistant output for text mode.

## Flow

```mermaid
flowchart TD
  A[providerGenerate runs pi --mode json --print] --> B[parse JSON event stream]
  B --> C{assistant message_end text found?}
  C -->|yes| D[continue output handling]
  C -->|no| E{text mode: fail inference}
  C -->|no| F[file mode: allow empty text]
  D --> G{text mode: require output tags}
  D --> H[file mode: tags optional]
```

## Notes

- Removed raw-stdout fallback when JSON assistant output is missing.
- Text generation now fails fast on malformed/non-assistant JSON output.
- File generation keeps optional textual confirmation behavior.
