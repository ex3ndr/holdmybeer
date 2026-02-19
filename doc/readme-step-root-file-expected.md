# README Root File Expected Output

`generateReadme` now performs file generation directly and relies on file-expected output mode via `generateFile`.

## Flow

```mermaid
flowchart TD
  A[bootstrap workflow] --> B{README.md exists in root?}
  B -->|yes| C[skip generation]
  B -->|no| D[generateReadme]
  D --> E[generateFile target: <project>/README.md]
  E --> F{README file appears at target path?}
  F -->|yes| G[continue bootstrap]
  F -->|no| H[retry then fail]
```

## Notes

- `generateReadme` targets `<project>/README.md` directly.
- The step uses file-expected output mode (no custom `verify` callback).
- `bootstrap` does not write README content manually after inference.
