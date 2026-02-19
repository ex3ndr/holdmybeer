# README Step Move

README generation is now implemented as a workflow step (`generateReadme`) so it participates in step-level inference progress state updates.

## Flow

```mermaid
flowchart TD
  A[bootstrap workflow] --> B[generateReadme step]
  B --> C[load PROMPT_README.md]
  C --> D[resolve prompt placeholders]
  D --> E[runInference sonnet read-only]
  E --> F[event-driven loader state updates]
  F --> G[write README.md]
```

## Notes

- Added `sources/_workflows/steps/generateReadme.ts`.
- Removed `sources/modules/ai/aiReadmeGenerate.ts`.
- Bootstrap now calls `generateReadme` directly.
