# Research Workflow Parallel Generation

A new workflow runs repository research document generation in parallel using `generateDocument`.

## Flow

```mermaid
flowchart TD
  A[user selects research workflow] --> B[start ctx.progresses]
  B --> C[line 1: PROMPT_RESEARCH with opus]
  B --> D[line 2: PROMPT_RESEARCH_PROBLEMS with codex]
  C --> E[generateDocument -> generateFile -> doc/research.md]
  D --> F[generateDocument -> generateFile -> doc/research-problems.md]
  E --> J[map inference events to progress labels]
  F --> J
  J --> K[update line status: thinking or tool activity]
  E --> G[mark line done]
  F --> H[mark line done]
  G --> I[workflow complete]
  H --> I
```

## Notes

- Workflow id: `research`.
- Prompt files:
  - `PROMPT_RESEARCH.md`
  - `PROMPT_RESEARCH_PROBLEMS.md`
- Model mapping:
  - Research summary: `opus`
  - Unresolved questions catalog: `codex-xhigh`
- Progress strings are updated from provider events (for example: `thinking`, `reading files`, `running command`).
