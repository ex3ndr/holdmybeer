# Project Local Settings

Settings now resolve only inside the current project folder.

## Flow

```mermaid
flowchart LR
  A[CLI --project path] --> B[projectPath]
  B --> C[<projectPath>/.beer/settings.json]
  C --> D[bootstrap/main read and write settings]
```

## Notes

- Removed global settings path resolution under `~/Developer/HoldMyBeerDev`.
- Launcher and workflows now use project-local `.beer/settings.json` paths.
