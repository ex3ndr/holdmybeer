# Command CWD Resolution

Commands now resolve their default working directory from invocation context (`INIT_CWD`) instead of process runtime cwd.

## Why

In development, workspace runners can execute the CLI from a different process cwd (for example package folder), which caused tool commands to run in the wrong directory.

## Flow

```mermaid
flowchart TD
  A[commandRun called] --> B{options.cwd provided?}
  B -->|yes| C[Use options.cwd]
  B -->|no| D[Use pathResolveFromInitCwd('.')]
  C --> E[spawn command]
  D --> E
```

## Result

- Tool commands consistently execute relative to the folder where the tool was invoked.
- Development execution and production execution now use the same command cwd behavior.
