# Inference Visibility

Inference now supports a per-call visibility flag on `inferText`:

- `showProgress: true`

When enabled, the flow prints text-only progress messages to the terminal, including provider selection, attempt start/exit, and streamed stdout/stderr lines.
Inference is also forced into read-only mode for all `inferText` calls.

## Flow

```mermaid
flowchart TD
  A[inferText called] --> B{showProgress?}
  B -->|false| C[Run inference silently]
  B -->|true| D[Attach onMessage logger]
  C --> E[Apply read-only prompt guard]
  D --> E
  E --> F[Run provider with read-only flags]
  F --> G[Emit provider selection + attempt events]
  G --> H[Stream stdout/stderr chunks as text lines]
  H --> I[Success or fallback]
```

## Bootstrap Usage

`bootstrap` enables this flag for README and commit message generation so long-running calls are visible before timeout.
Before README inference, bootstrap checks out the source repository into `.beer/original` and passes that path in the prompt as read-only context.
