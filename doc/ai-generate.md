# AI Generate Function

Added a shared `generate` function for inference calls that accepts prompt + permissions and routes through `Context.inferText`.

## Flow

```mermaid
flowchart LR
  A[aiReadmeGenerate builds prompt] --> B[generate(context, prompt, permissions)]
  B --> C[context.inferText]
  C --> D[generateText]
  D --> E[provider CLI]
```

## Notes

- `generate` defaults to provider order `claude -> codex`.
- `generate` defaults to `read-only` write policy.
- README generation now uses `generate` and passes explicit read-only permissions.
- Inference errors now bubble up (no fallback text path).
