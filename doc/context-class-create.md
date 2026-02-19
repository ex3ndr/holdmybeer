# Context Class Create

Workflow context is now a class created via `Context.create(folder)` and used as the shared runtime API for workflows and steps.

## Flow

```mermaid
flowchart TD
  A[main.ts] --> B[Context.create(projectFolder)]
  B --> C[providerDetect]
  C --> D[Context instance]
  D --> E[workflow.run(ctx)]
  E --> F[ctx.applyConfig / ctx.askGithubRepo]
  E --> G[ctx.progress(message, report => ...)]
  E --> H[ctx.checkpoint(message)]
```

## Methods

- Added to `Context`:
  - `existFile(file)`
  - `existDir(dir)`
  - `writeFile(file, contents)`
  - `makeDirs(dir)`
  - `checkpoint(message?)`
  - `progress(message, async (report) => {})`
  - `askGithubRepo(question, defaultValue?)`
  - `applyConfig(update)`
  - `settings` (read-only)
- Removed from context API:
  - `inferText`

## Notes

- Helper utilities moved into `sources/_workflows/context/utils/`:
  - `contextAskGithubRepo.ts`
  - `contextApplyConfig.ts`
- Bootstrap now uses context methods instead of inline repo/settings helper logic.
