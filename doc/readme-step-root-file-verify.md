# README Root File Verify

`generateReadme` now performs file generation directly and verifies the generated artifact via `expectedOutput.verify` forwarding in `generateFile`.

## Flow

```mermaid
flowchart TD
  A[bootstrap workflow] --> B{README.md exists in root?}
  B -->|yes| C[skip generation]
  B -->|no| D[generateReadme]
  D --> E[generateFile target: <project>/README.md]
  E --> F[verify callback]
  F --> G{root path + non-empty file?}
  G -->|yes| H[continue bootstrap]
  G -->|no| I[verification failure and retry/error]
```

## Notes

- `generateReadme` now targets `<project>/README.md` directly.
- Verification enforces root path and non-empty file content.
- `bootstrap` no longer writes README content manually after inference.
