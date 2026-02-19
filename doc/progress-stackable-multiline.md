# Stackable Multiline Progress

Progress rendering now stacks automatically across concurrent `ctx.progress(...)` calls and does not require any separate multiline API.

## Flow

```mermaid
sequenceDiagram
    participant Caller
    participant Context
    participant Stack as progressMultiline

    Caller->>Context: progress("task", operation)
    Context->>Context: acquire shared stack
    Context->>Stack: add("task")
    Caller-->>Context: operation resolves "task done"
    Context->>Stack: line.done("task done")
    Context->>Context: release stack
    Context-->>Caller: returns operation result

    Caller->>Context: progress("task", operation)
    Caller-->>Context: operation throws Error("task failed")
    Context->>Stack: line.fail("task failed")
    Context->>Context: release stack
    Context-->>Caller: rethrow error
```

## Behavior

- Status symbols are now `✔` for success and `❌` for failure.
- Success line message is auto-derived when the operation result is a non-empty string.
- Failure line message is auto-derived from `Error.message` (or thrown string when used).
