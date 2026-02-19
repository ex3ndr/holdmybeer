# PathLock Utility

## Summary
- Added `AsyncLock` (`sources/modules/util/asyncLock.ts`) for sequential async critical sections.
- Added pure path overlap helpers (`sources/modules/util/pathLockOverlap.ts`) for exhaustive parent/child matching.
- Added `PathLock` (`sources/modules/util/pathLock.ts`) with:
  - Memory mode: `PathLock.create()`
  - Disk mode: `PathLock.open(filePath)` with atomic JSON sync
  - Lock API: `lock(paths)` returning `{ locked, conflicts, release }`
- Integrated Context with:
  - Internal singleton lock: `context.lockIO(paths)`
  - Disk lock factory: `context.createPathLock(filePath)`
- Re-exported `PathLockResult` through `@/types`.

## Flow
```mermaid
flowchart TD
    A[Caller] --> B[Context.lockIO or Context.createPathLock]
    B --> C[PathLock.lock(paths)]
    C --> D[AsyncLock.inLock critical section]
    D --> E{Conflicts with existing locks?}
    E -- Yes --> F[Return locked=false + conflicts]
    E -- No --> G[Add normalized paths to lock set]
    G --> H{Disk mode?}
    H -- No --> I[Return release handle]
    H -- Yes --> J[Write temp JSON file]
    J --> K[Atomic rename temp to target]
    K --> I
    I --> L[release()]
    L --> D
```

## Disk Format
```json
{
  "locked": ["src/foo.ts", "src/bar"]
}
```
