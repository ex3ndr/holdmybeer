# PathLock Utility

## Overview
- `PathLock` — standalone class for locking paths (not filesystem-related, pure string path matching)
- Two modes: **disk-persisted** (opens from a file path, syncs via atomic JSON writes) and **memory-only** (no file path)
- Directory locks are exhaustive (locking `src/bar` covers `src/bar/baz.ts`)
- Returns release handle on successful lock; returns conflict info on failure
- Context creates PathLock instances (since paths are relative to project root)
- Context holds a **singleton memory-only PathLock** for internal I/O coordination

## Context (from discovery)
- Context class: `sources/_workflows/context/context.ts`
- Context utils: `sources/_workflows/context/utils/contextXxx.ts`
- General utils: `sources/modules/util/`
- No `AsyncLock` or atomic write utilities exist yet — must create
- `fast-glob` is a dependency but unused; not needed here (pure path matching)
- CLAUDE.md prescribes `AsyncLock` for mutual exclusion in async code

## Design

### PathLock class

```typescript
// sources/modules/util/pathLock.ts

interface PathLockResult {
    locked: boolean;
    conflicts: string[];              // conflicting paths (empty when locked=true)
    release: (() => Promise<void>) | null;  // null when locked=false; async for disk sync
}

class PathLock {
    // Memory-only
    static create(): PathLock

    // Disk-persisted: reads existing locks from file, syncs on lock/release
    static async open(filePath: string): Promise<PathLock>

    // Lock paths. Returns conflicts + release handle.
    async lock(paths: string[]): Promise<PathLockResult>
}
```

### Overlap algorithm
For each new path `p` against each existing locked path `e`:
1. `p === e` → conflict (exact match)
2. `e` starts with `p/` → conflict (new path is parent dir of existing lock)
3. `p` starts with `e/` → conflict (existing lock is parent dir of new path)

Normalize paths: strip trailing slashes, resolve `.` / `..` segments.

### Disk persistence
- JSON format: `{ "locked": ["path/a", "path/b"] }`
- Atomic writes: write to temp file, then `rename()` (atomic on POSIX)
- `AsyncLock` guards all read-modify-write cycles to prevent concurrent overwrites
- On `open()`: read existing file (or start empty if missing)
- On `lock()` / `release()`: re-write file under lock

### Context integration
- Context creates `PathLock.create()` as singleton for internal I/O lock
- Context exposes a factory: `createPathLock(filePath: string): Promise<PathLock>` for disk-persisted locks (resolves path relative to project)

## Development Approach
- **Testing approach**: TDD
- Complete each task fully before moving to the next
- **CRITICAL: every task MUST include new/updated tests**
- **CRITICAL: all tests must pass before starting next task**

## Implementation Steps

### Task 1: Create `asyncLock.ts` utility
- [ ] Create `sources/modules/util/asyncLock.ts`
- [ ] Implement `AsyncLock` class with `async inLock<T>(fn: () => Promise<T>): Promise<T>` — queues callers, executes sequentially
- [ ] Write tests: sequential execution, queuing, error propagation, return values
- [ ] Run tests — must pass before next task

### Task 2: Create `pathLockOverlap.ts` with pure overlap logic
- [ ] Create `sources/modules/util/pathLockOverlap.ts`
- [ ] Implement `pathLockOverlap(pathA: string, pathB: string): boolean` — exact match or parent/child via prefix
- [ ] Implement `pathLockConflicts(newPaths: string[], locked: string[]): string[]` — returns conflicting existing paths
- [ ] Write tests: exact match, parent covers child, child under parent, no overlap, siblings, trailing slash normalization
- [ ] Run tests — must pass before next task

### Task 3: Create `pathLock.ts` — the PathLock class
- [ ] Create `sources/modules/util/pathLock.ts`
- [ ] Define `PathLockResult` type: `{ locked: boolean; conflicts: string[]; release: (() => Promise<void>) | null }`
- [ ] Implement `PathLock.create()` — memory-only mode
- [ ] Implement `PathLock.open(filePath)` — reads JSON from disk, creates instance with persistence
- [ ] Implement `async lock(paths: string[]): Promise<PathLockResult>` — checks conflicts, adds to set, writes to disk if persisted, returns release handle
- [ ] Release handle: removes paths from set, writes to disk if persisted
- [ ] Use `AsyncLock` to guard all state mutations and disk I/O
- [ ] Write tests for memory-only: lock succeeds, conflict detection, release frees paths, re-lock after release, empty paths
- [ ] Write tests for disk-persisted: open creates file, lock persists, release persists, re-open reads existing locks
- [ ] Run tests — must pass before next task

### Task 4: Export types from `@/types`
- [ ] Add `PathLockResult` export to `sources/types.ts`
- [ ] Run typecheck — must pass

### Task 5: Wire PathLock into Context
- [ ] Add `private readonly ioLock = PathLock.create()` singleton field to Context
- [ ] Add `createPathLock(filePath: string): Promise<PathLock>` method — resolves path relative to project, delegates to `PathLock.open()`
- [ ] Run tests — must pass before next task

### Task 6: Verify acceptance criteria
- [ ] Verify memory-only lock works (lock, conflict, release cycle)
- [ ] Verify disk-persisted lock works (open, lock, release, re-open reads state)
- [ ] Verify exhaustive directory locking (parent/child overlap)
- [ ] Verify atomic writes (no partial JSON on disk)
- [ ] Run full test suite (`bun run test`)
- [ ] Run linter (`bun run lint`)

### Task 7: [Final] Update documentation
- [ ] Add doc entry in `/doc/` describing PathLock with mermaid diagram

## Technical Details

### File layout
```
sources/modules/util/
  asyncLock.ts           # AsyncLock class
  asyncLock.spec.ts
  pathLockOverlap.ts     # Pure overlap functions
  pathLockOverlap.spec.ts
  pathLock.ts            # PathLock class
  pathLock.spec.ts
```

### JSON disk format
```json
{
  "locked": ["src/foo.ts", "src/bar"]
}
```

### Atomic write strategy
```typescript
// Write to temp file next to target, then rename
const tmp = filePath + ".tmp";
await writeFile(tmp, JSON.stringify(data), "utf-8");
await rename(tmp, filePath);  // atomic on POSIX
```

### Edge cases
- Empty paths array → `{ locked: true, conflicts: [], release: async noop }`
- Locking same path twice (same PathLock) → conflict
- Release is idempotent (second call is no-op)
- `open()` on missing file → starts with empty lock set, creates file on first lock
- Path normalization: strip trailing `/`, collapse `//`, no leading `./`

## Post-Completion
- Context's `ioLock` singleton is available for workflows to coordinate I/O
- Disk-persisted PathLock instances can coordinate across processes via shared JSON file
