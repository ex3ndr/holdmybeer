# Context Multiline Progress

Context now supports dynamic multiline progress through concurrent `ctx.progress(...)` calls on a shared renderer.

## Flow

```mermaid
flowchart TD
  A[workflow starts parallel ctx.progress calls] --> B[start shared progressMultilineStart]
  B --> C[each progress adds one line]
  C --> D[line updates with report(message)]
  D --> E{line success?}
  E -->|yes| F[line done "✔"]
  E -->|no| G[line fail "❌"]
  F --> H[release shared renderer reference]
  G --> H
  H --> I{active progress users left?}
  I -->|yes| J[keep rendering]
  I -->|no| K[stop renderer timer]
```

## Notes

- Each `ctx.progress(...)` call creates one line in the shared multiline renderer.
- Parallel progress calls stack naturally without a separate `progresses` API.
- The renderer supports concurrent line execution and shared terminal redraw.
