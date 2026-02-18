# Inference Provider Tests

Added provider-specific inference tests that run real Claude and Codex CLIs (no mocks).

## Flow

```mermaid
flowchart TD
  A[generateText called] --> B[Select claude provider]
  B --> C{Claude succeeds?}
  C -->|yes| D[Return provider output]
  C -->|no| E[Assert no provider-flag parse errors]
```

## Coverage

- Claude execution validates `--dangerously-skip-permissions` is accepted by the real CLI.
- Codex execution validates `--dangerously-bypass-approvals-and-sandbox` is accepted by the real CLI.
