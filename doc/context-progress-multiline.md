# Context Multiline Progress

Context now supports dynamic multiline progress via `ctx.progresses(...)`, allowing lines to be added on demand and run concurrently.

## Flow

```mermaid
flowchart TD
  A[workflow calls ctx.progresses] --> B[start progressMultilineStart]
  B --> C[add line dynamically with progresses.add or progresses.run]
  C --> D[run async tasks in parallel Promise.all]
  D --> E[line updates with report(message)]
  E --> F{line success?}
  F -->|yes| G[line done "*"]
  F -->|no| H[line fail "x"]
  G --> I{all done?}
  H --> I
  I -->|success| J[mark unresolved running lines done]
  I -->|failure| K[mark unresolved running lines failed]
  J --> L[stop renderer timer]
  K --> L
```

## Notes

- Lines are not predefined; each line is created when needed.
- `progresses.run(...)` is a convenience helper mirroring `ctx.progress(...)` per line.
- The renderer supports concurrent line execution and shared terminal redraw.
