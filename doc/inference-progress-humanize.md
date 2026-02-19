# Inference progress: user-friendly labels

## Problem

The spinner during inference showed raw SSE protocol events like
"PI assistant message started", "PI text streaming", "PI turn started".
These are internal implementation details, not meaningful to users.

## Solution

Replaced verbose protocol-level event mapping with simple content-level labels:

- `content_block_delta delta=thinking_delta` → "thinking"
- `content_block_delta delta=text_delta` → "writing"
- `content_block_start content=tool_use` → "using tools"
- `content_block_delta delta=input_json_delta` → "using tools"
- `content_block_start content=text` → "writing"

All other events (turn start/end, message start/end, selected, started,
completed, model, stderr, exit codes) are suppressed — the spinner keeps
its last meaningful label until the next content event or completion.

## Spinner examples

```
/ Generating README.md
/ Generating README.md (thinking)
/ Generating README.md (writing)
* Generating README.md
```

```mermaid
stateDiagram-v2
    [*] --> Base: stepProgressStart
    Base --> Thinking: delta=thinking_delta
    Base --> Writing: delta=text_delta
    Base --> UsingTools: content=tool_use
    Thinking --> Writing: delta=text_delta
    Writing --> UsingTools: content=tool_use
    UsingTools --> Writing: delta=text_delta
    Writing --> [*]: done()
    Thinking --> [*]: done()
    UsingTools --> [*]: done()
```

## Files changed

- `sources/_workflows/steps/runInference.ts` — simplified humanize functions
- `sources/_workflows/steps/runInference.spec.ts` — updated tests
