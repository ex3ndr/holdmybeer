# README Step Move

README generation is now implemented as a workflow step (`generateReadme`) so it participates in step-level inference progress state updates.

## Flow

```mermaid
flowchart TD
  A[bootstrap workflow] --> B[generateReadme step]
  B --> C{README.md exists?}
  C -->|No| D[load PROMPT_README.md]
  D --> E[resolve prompt placeholders]
  E --> F[runInference sonnet read-only]
  F --> G[event-driven loader state updates]
  G --> H[write README.md]
  C -->|Yes| I[skip README generation]
  H --> J[ensure .gitignore includes .beer/local/]
  I --> J
  J --> K[first commit stage can include both files]
```

## Notes

- Added `sources/_workflows/steps/generateReadme.ts`.
- Removed `sources/modules/ai/aiReadmeGenerate.ts`.
- Bootstrap now calls `generateReadme` directly.
- Bootstrap skips `generateReadme` when `README.md` is already present.
- README materialization ensures `.gitignore` before the first commit.
