# Pure Inference Mode

## Summary
- Added a pure inference path that disables PI tools, extensions, and skills.
- Added `generatePureText` and `generatePureSessionCreate` for raw prompt flows.
- Kept fail-fast behavior: provider failures still fail the operation.

## Flow
```mermaid
flowchart TD
    A[generatePureText] --> B[sandboxPassthrough]
    A --> C[providerPriorityList + providerModelSelect]
    A --> D[providerGenerate pure=true requireOutputTags=false]
    D --> E[piProviderGenerate pure=true]
    E --> F["pi --mode json --print --no-tools --no-extensions --no-skills"]
    D --> G[provider event stream]
    G --> H[GenerateEvent with providerId]
```

## Notes
- Pure mode sends the prompt unchanged (no sandbox preamble, no output-tag instructions).
- Session continuity is available via `generatePureSessionCreate`.
