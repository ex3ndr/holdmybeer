# Text Module Location

The text catalog, generated types, and loader now live under `sources/text`.

## Structure

```mermaid
flowchart LR
  A[sources/text/all.txt] --> B[sources/text/textGenMacro.ts]
  B --> C[sources/text/textGenBuild.ts]
  C --> D[sources/text/text.gen.ts]
  D --> E[sources/text/text.ts]
  F[@text alias] --> E
```

- Moved `sources/modules/text/text.ts` to `sources/text/text.ts`.
- Moved `sources/modules/text/all.txt` to `sources/text/all.txt`.
- Added generated catalog/types file: `sources/text/text.gen.ts`.
- Updated build and alias paths to the new location.
