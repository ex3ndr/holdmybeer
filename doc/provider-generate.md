# Provider Generate

Added shared `providerGenerate` for codex/claude CLI inference execution.

## Flow

```mermaid
flowchart TD
  A[providerGenerate input] --> B[resolve provider args]
  B --> C[run commandRun in sandbox]
  C --> D{exit code 0?}
  D -->|no| E[return failure]
  D -->|yes| F{output tags present?}
  F -->|yes| G[return extracted output]
  F -->|no| H[retry once with output reminder]
  H --> I{output tags present?}
  I -->|no| E
  I -->|yes| G
```

## Notes

- Uses provider-native non-interactive invocation:
  - Claude: `claude --dangerously-skip-permissions -p <prompt>`
  - Codex: `codex exec --dangerously-bypass-approvals-and-sandbox -- <prompt>`
- Uses provider-specific execution flags per CLI.
- Applies codex env overrides required for sandbox execution.
- Codex execution runs without codex-native sandbox flags and without the outer Anthropic sandbox wrapper.
