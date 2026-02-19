Document generation now renders workflow progress by default, so research runs no longer execute silently after workflow selection.

## Flow

```mermaid
flowchart TD
  A[researchWorkflow calls generateDocument] --> B{showProgress is false?}
  B -->|yes| C[run generateFile directly]
  B -->|no/default| D[wrap in ctx.progress]
  D --> E[update message via generateProgressMessageResolve]
```

## Notes

- `generateDocument(...)` now defaults to progress-on unless explicitly disabled.
- `showProgress: false` still bypasses spinner wrapping for non-interactive or nested flows.
