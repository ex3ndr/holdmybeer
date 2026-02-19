# Tree Search Inference Progress

Tree search now reports progress per inference call using the same event-humanized labels (`thinking`, `working`, `reading files`, `running command`) and token counters used in other inference flows.

## Progress Model

```mermaid
flowchart TD
  A[treeSearchRun] --> B[root children inference]
  B --> C[treeNodeExpand: document inference]
  C --> D[treeNodeExpand: children inference]
  D --> E[treeLeafPick inference]

  B --> P1[treeInferenceProgressRun]
  C --> P2[treeInferenceProgressRun]
  D --> P3[treeInferenceProgressRun]
  E --> P4[treeInferenceProgressRun]

  P1 --> M[generateProgressMessageResolve]
  P2 --> M
  P3 --> M
  P4 --> M
```

## Implementation Notes

- `treeInferenceProgressRun` wraps exactly one inference call in its own `ctx.progress` line.
- Each call forwards `onEvent` to inference and updates progress text via `generateProgressMessageResolve`.
- Result: tree planning now mirrors standard progress behavior while preserving existing tree orchestration logic.
