# Text Module Location

The text catalog and loader now live under `sources/text`.

## Structure

```mermaid
flowchart LR
  A[sources/text/text.ts] --> B[sources/text/all.txt]
  C[@text alias] --> A
```

- Moved `sources/modules/text/text.ts` to `sources/text/text.ts`.
- Moved `sources/modules/text/all.txt` to `sources/text/all.txt`.
- Updated build and alias paths to the new location.
