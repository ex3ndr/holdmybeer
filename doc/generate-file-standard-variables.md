# GenerateFile Standard Variables

`generateFile` now injects standard prompt template variables internally before running inference.

## Flow

```mermaid
flowchart TD
  A[caller invokes generateFile] --> B[resolve outputFilePath to absolute outputPath]
  B --> C[derive originalCheckoutPath from project path]
  C --> D[read sourceFullName from ctx.settings.sourceRepo]
  D --> E[replace prompt placeholders]
  E --> F[append file-only write constraints]
  F --> G[run generate with write-whitelist]
  G --> H[verify target file exists and retry if needed]
```

## Standard Variables

- `{outputPath}`: absolute path of the file being generated.
- `{originalCheckoutPath}`: `<project>/.beer/local/original`.
- `{sourceFullName}`: source repository full name when configured in settings.
