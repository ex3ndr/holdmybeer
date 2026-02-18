# Modules And Apps Separation

The source tree is now split into core modules and workflow apps.

## Structure

```mermaid
flowchart TD
  A[sources/main.ts] --> B[modules]
  A --> D[commands]
  D --> C[apps]
  C --> B

  subgraph Modules
    M1[modules/ai]
    M2[modules/context]
    M3[modules/github]
    M4[modules/git]
    M5[modules/sandbox]
    M6[modules/providers]
    M7[modules/beer]
    M8[modules/util]
    M9[modules/prompt]
  end

  subgraph Text
    T1[text/text.ts]
    T2[text/all.txt]
  end

  subgraph Commands
    C1[commands/bootstrapCommand.ts]
  end

  subgraph Apps
    A1[apps/bootstrap.ts]
  end
```

## Intent

- `modules/*`: reusable, non-workflow capabilities (inference, context, integrations, utilities).
- `commands/*`: CLI command definitions and argument handling.
- `apps/*`: workflow orchestration (bootstrap flow and its step coordination).
