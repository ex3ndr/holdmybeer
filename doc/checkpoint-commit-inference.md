# Checkpoint Commit Message Inference

`ctx.checkpoint()` uses AI inference to generate Angular-style commit messages from an optional user hint.

## Flow

```mermaid
sequenceDiagram
    participant User
    participant Workflow as checkpointWorkflow
    participant Ctx as ctx.checkpoint()
    participant GenCommit as generateCommit
    participant AI as generate (inference)

    User->>Workflow: run checkpoint
    Workflow->>User: prompt for optional hint
    User-->>Workflow: hint (or empty)
    Workflow->>Ctx: checkpoint(hint, { remote, branch })
    Ctx->>GenCommit: generateCommit(ctx, { hint, modelSelectionMode })
    GenCommit->>AI: generate(prompt + hint, mode=sonnet)
    AI-->>GenCommit: Angular-style commit message
    GenCommit-->>Ctx: { text: "feat: ..." }
    Ctx->>Ctx: stageAndCommit(message)
    Ctx->>Ctx: gitPush(remote, branch)
    Ctx-->>Workflow: { committed }
```

## Model Selection

`ctx.checkpoint()` defaults to `sonnet` model selection mode. Callers can override via `options.modelSelectionMode` (e.g. bootstrap uses `codex-high`).

## Prompt

The commit message prompt asks for a single-line Angular-style commit message. When the caller provides a hint, it is included as `Context: {hint}`. When no hint is given, the context defaults to `"checkpoint of current changes"`.
