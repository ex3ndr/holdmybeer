# holdmybeer agent notes

## Goals
- keep the core minimal and composable
- add integrations incrementally
- **NO INFERENCE FALLBACKS EVER** — if AI providers fail, the operation fails. Do not add try/catch fallbacks, hardcoded default text, or graceful degradation around inference calls. The user must fix their provider setup.

## Conventions
- single workspace package at `packages/holdmybeer`
- typescript only, esm output
- sources live in `sources/`
- tests use `*.spec.ts`
- tests must be minimal and live next to the file under test

## Build, Test, and Development Commands
- Runtime baseline: Bun **1.3+**.
- Install deps: `bun install`
- Run `bun install` before tests.
- Run CLI in dev: `bun run dev`.
- Node remains supported for running built output (`dist/*`) and production installs.
- Type-check/build: `bun run typecheck` (tsc)
- Tests: `bun run test` (vitest);

## Coding Style & Naming Conventions
- Language: TypeScript (ESM). Prefer strict typing; avoid `any`.
- Never parse or write markdown frontmatter manually; always use the `gray-matter` library (including stringify/write flows).
- Add brief code comments for tricky or non-obvious logic.
- Keep files concise; extract helpers instead of "V2" copies.
- Aim to keep files under ~700 LOC; guideline only (not a hard guardrail). Split/refactor when it improves clarity or testability.
- Naming: use **HoldMyBeer** for product/app/docs headings; use `holdmybeer` for package name; use `beer` for CLI command, binary, paths, and config keys.
- Function naming: do not use the `Build` suffix. Prefer direct names such as `contextForAgent` (not `contextForAgentBuild`).
- Use `@/types` for shared types whenever available instead of deep module imports.

## Central Types (`@/types`)
- Prefer `import type { ... } from "@/types"` for shared/cross-cutting types.
- Add cross-cutting/public types to `sources/types.ts` and re-export there.
- Keep domain-internal types in their local modules.

## Agent-Specific Notes
- Never edit `node_modules` (global/Homebrew/npm/git installs too). Updates overwrite. Skill notes go in `tools.md` or `AGENTS.md`.
- When working on a GitHub Issue or PR, print the full URL at the end of the task.
- When answering questions, respond with high-confidence answers only: verify in code; do not guess.
- Patching dependencies (pnpm patches, overrides, or vendored changes) requires explicit approval; do not do this by default.
- If shared guardrails are available locally, review them; otherwise follow this repo's guidance.
- **Multi-agent safety:** do **not** create/apply/drop `git stash` entries unless explicitly requested (this includes `git pull --rebase --autostash`). Assume other agents may be working; keep unrelated WIP untouched and avoid cross-cutting state changes.
- **Multi-agent safety:** when the user says "push", you may `git pull --rebase` to integrate latest changes (never discard other agents' work). When the user says "commit", scope to your changes only. When the user says "commit all", commit everything in grouped chunks.
- **Multi-agent safety:** do **not** create/remove/modify `git worktree` checkouts (or edit `.worktrees/*`) unless explicitly requested.
- **Multi-agent safety:** do **not** switch branches / check out a different branch unless explicitly requested.
- **Multi-agent safety:** running multiple agents is OK as long as each agent has its own agent directory.
- **Multi-agent safety:** focus reports on your edits; avoid guard-rail disclaimers unless truly blocked; when multiple agents touch the same file, continue if safe; end with a brief "other files present" note only if relevant.
- Bug investigations: read source code of relevant npm dependencies and all related local code before concluding; aim for high-confidence root cause.
- Code style: add brief comments for tricky logic; keep files under ~500 LOC when feasible (split/refactor as needed).
- Release guardrails: do not change version numbers without operator's explicit consent; always ask permission before running any npm publish/release step.
- keep configs small and explicit
- avoid hidden side effects
- commit after each ready-to-use change using Angular-style commits
- build before each commit and run tests
- document every change in `/doc/` with mermaid diagrams
- do not use barrel `index.ts` files
- avoid backward-compatibility shims for internal code

## Facade Classes
When a domain needs coordination logic (scheduling, resolving, registry), create a **plural-named facade class**:

| Domain object | Facade class | Responsibility |
|---------------|--------------|----------------|
| `Tool` | `Tools` | resolving, registration, execution |
| `Heartbeat` | `Heartbeats` | scheduling, lifecycle |
| `Agent` | `Agents` | lookup, creation, persistence |
| `Module` | `Modules` | loading, dependency wiring |

The facade owns the collection and coordination logic. Domain objects remain simple data or behavior units.

```typescript
// Heartbeat is a single heartbeat definition
interface Heartbeat { id: string; interval: number; action: () => void; }

// Heartbeats is the facade that manages all heartbeats
class Heartbeats {
  private items: Map<string, Heartbeat> = new Map();
  private scheduler: Scheduler;

  register(heartbeat: Heartbeat): void { /* ... */ }
  start(): void { /* ... */ }
  stop(): void { /* ... */ }
}
```

## Object Lifecycle
Do not implement `close()`, `dispose()`, or cleanup methods unless explicitly needed. Assume objects live forever in memory.

When cleanup **is** required (e.g., file handles, network connections, timers):
- Use `shutdown.ts` hooks for process-level cleanup
- Document why cleanup is necessary in a comment

Avoid patterns like disposable resources, reference counting, or manual memory management unless dealing with external resources.

## Utility Functions
Place general-purpose helpers in `sources/util/`. This includes:
- String manipulation (`stringUtils.ts`, `trimIdent.ts`)
- Time/date helpers (`time.ts`, `timeFormat.ts`, `isoDate.ts`)
- Async primitives (`lock.ts`, `sync.ts`, `debounce.ts`)
- Shutdown coordination (`shutdown.ts`)

Keep utilities **domain-agnostic**. If a helper is specific to a domain (e.g., github, beer), it belongs in that domain folder instead.

## Time Handling
Use **unix timestamps** (milliseconds since epoch) for all time values in the application. Only use `Date` objects at boundaries for parsing or formatting.

```typescript
// Good: store and pass around unix timestamps
const now = Date.now();
const expiresAt = now + 60_000; // 1 minute from now

function isExpired(expiresAt: number): boolean {
  return Date.now() > expiresAt;
}

// Good: Date only for display/parsing
const formatted = new Date(expiresAt).toISOString();
const parsed = new Date("2025-01-15T10:00:00Z").getTime();

// Bad: passing Date objects around
function isExpired(expiresAt: Date): boolean { /* ... */ }
```

Why:
- **Simpler arithmetic**: `now + 60_000` vs `new Date(date.getTime() + 60_000)`
- **JSON-friendly**: numbers serialize cleanly
- **Immutable**: no accidental mutation
- **Comparable**: `a > b` works directly

## Async Patterns

### AsyncLock for Exclusive Code Blocks
Use `AsyncLock` when you need mutual exclusion in async code. Do not use timers, flags, or manual promise chains for this purpose.

```typescript
import { AsyncLock } from "@/util/lock.js";

const lock = new AsyncLock();

// Multiple callers queue up and execute sequentially
await lock.inLock(async () => {
  // Only one caller executes this block at a time
  await criticalOperation();
});
```

### InvalidateSync for Periodic Retry Handlers
Use `InvalidateSync` for operations that should be retried with backoff and coalesced when triggered multiple times (e.g., saving state to disk, syncing remote data).

```typescript
import { InvalidateSync } from "@/util/sync.js";

const sync = new InvalidateSync(async () => {
  await saveStateToDisk();
});

// Multiple rapid calls coalesce into one execution
sync.invalidate(); // triggers async command
sync.invalidate(); // marks for re-run after current completes
sync.invalidate(); // no-op, already marked

// Wait for completion if needed
await sync.invalidateAndAwait();
```

Key behaviors:
- **Backoff**: automatically retries on failure with exponential backoff
- **Coalescing**: rapid invalidations merge into at most two runs (current + one pending)
- **Stoppable**: call `stop()` to cancel pending work during shutdown

### ValueSync for Latest-Value Processing
Use `ValueSync` when you need to process the latest value asynchronously, dropping intermediate values:

```typescript
import { ValueSync } from "@/util/sync.js";

const sync = new ValueSync<State>(async (state) => {
  await persistState(state);
});

sync.setValue(state1); // starts processing
sync.setValue(state2); // replaces pending value
sync.setValue(state3); // replaces again; only state3 persists
```

## File Organization: One Function, Prefix Naming

### Core Principle
Write **one public function per file**. Name files and functions using **prefix notation** where the domain/noun comes first: `githubRepoCreate` not `createGithubRepo`, `beerSettingsRead` not `readBeerSettings`.

### Why Prefix Notation
- **Autocomplete-friendly**: typing `github` shows all github operations
- **File explorer grouping**: related files cluster alphabetically (`githubRepoCreate.ts`, `githubRepoExists.ts`, `githubRepoParse.ts`)
- **Import clarity**: `import { githubRepoCreate } from "./githubRepoCreate.js"` is self-documenting
- **Avoids verb collision**: no more `createRepo`, `createSettings`, `createContext` scattered everywhere

### File Naming Convention
```
domainVerb.ts        # file name matches function name exactly
domainVerb.spec.ts   # unit test lives next to the file
```

Example: `githubRepoParse.ts` exports `githubRepoParse()`, tested in `githubRepoParse.spec.ts`.

### Underscore Prefix for Aggregation Files
Use an underscore prefix (`_`) for files that aggregate or combine multiple items into a single list or registry:

```
_providers.ts    # all provider implementations
_commands.ts     # all CLI commands
```

This distinguishes aggregation files from regular single-function files and makes them sort first in file explorers.

### Function Documentation
Each public function should have a brief comment describing its **purpose** and **expectations**:
```typescript
/**
 * Parses a GitHub repository reference from a URL or owner/repo string.
 * Returns null if the input cannot be parsed.
 *
 * Expects: non-empty string; handles both full URLs and shorthand.
 */
export function githubRepoParse(
  input: string
): GitHubRepoRef | null {
  // ...
}
```

Keep comments concise—purpose (what it does) and expectations (preconditions, constraints) in 2-4 lines.

### Internal Helpers Are OK
The "one public function per file" rule applies to **exported** functions. Internal helper functions within the same file are fine when they:
- Support the main exported function
- Are too small or specific to warrant their own file
- Would not be reused elsewhere

```typescript
// commandRun.ts

/** Quotes a shell argument if it contains special characters. */
function commandShellQuote(value: string): string {
  if (/^[A-Za-z0-9_/.:-]+$/.test(value)) {
    return value;
  }
  return `'${value.replace(/'/g, `'\\\\''`)}'`;
}

/**
 * Runs a command and captures stdout/stderr.
 * Throws on non-zero exit unless allowFailure is true.
 */
export async function commandRun(
  command: string,
  args: string[],
  options: CommandRunOptions = {}
): Promise<CommandRunResult> {
  // ...
}
```

If an internal helper grows complex or gets reused, extract it to its own file.

### Grouping by Domain
Organize files into domain folders. Each folder contains many small files:
```
beer/
  beerSettingsRead.ts
  beerSettingsWrite.ts
  beerSettingsPathResolve.ts
github/
  githubCliEnsure.ts
  githubRepoCreate.ts
  githubRepoExists.ts
  githubRepoParse.ts
  githubRepoNameResolve.ts
rewrite/
  rewriteRun.ts
  baselineRewrite.ts
```

### Pure Functions First
- **Prefer pure functions**: input → output, no side effects, no mutations
- **Isolate impure code**: I/O, state mutations, and side effects go in clearly named files (`beerSettingsWrite.ts`, `gitPush.ts`)
- **Dependency injection**: pass dependencies as arguments rather than importing singletons

### Testing Pure Functions
Every pure function gets a unit test in `*.spec.ts` next to it:
```typescript
// githubRepoParse.ts
export function githubRepoParse(input: string): GitHubRepoRef | null {
  // pure transformation
}

// githubRepoParse.spec.ts
import { describe, it, expect } from "vitest";
import { githubRepoParse } from "./githubRepoParse.js";

describe("githubRepoParse", () => {
  it("parses owner/repo shorthand", () => {
    const result = githubRepoParse("ex3ndr/holdmybeer");
    expect(result?.fullName).toBe("ex3ndr/holdmybeer");
  });
});
```

### When to Combine
Some exceptions where multiple exports in one file make sense:
- **Type definitions**: group related types in `*Types.ts`
- **Tiny predicates**: small related checks can share a file if under ~30 lines total
- **Tightly coupled pairs**: a function and its inverse (`encode`/`decode`)

### Migration Strategy
When refactoring large files:
1. Identify pure helper functions at the bottom of the file
2. Extract each to its own file with prefix naming
3. Write unit tests for extracted functions
4. Keep the orchestrating class/function that wires everything together
5. The orchestrator imports small, tested pieces

## Central Types: `@/types`

### Purpose
Consolidate shared type definitions in `sources/types.ts`, accessible via the `@/types` path alias. This provides a single import point for types used across domains.

### Usage
```typescript
import type { BeerSettings, Context, GitHubRepoRef } from "@/types";
```

### Rule
- Always import shared types via `@/types` when available; only the defining type files should use local module paths to avoid cycles.

### What Goes in `@/types`
- **Cross-cutting types**: types used by 3+ modules (e.g., `Context`, `BeerSettings`)
- **Public API types**: types other domains need to consume
- **Re-exports from domain modules**: aggregate exports for convenience

### What Stays in Domain Modules
- **Internal types**: types used only within a single domain folder
- **Implementation details**: types that are not part of the public API

### Structure
```typescript
// sources/types.ts
export type { BeerSettings } from "./beer/beerSettingsTypes.js";
export type { Context } from "./context/contextTypes.js";
export type { GitHubRepoRef } from "./github/githubTypes.js";
// ... more re-exports
```

### Path Alias Configuration
The `@/types` alias is configured in `tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "@/types": ["./sources/types.ts"]
    }
  }
}
```

## Text Catalog (`@text`)

All user-facing strings (console messages, error messages, prompt labels) live in a single file: `sources/text/all.txt`.

### File format
`all.txt` uses `key = value` lines. Comments start with `#`, blank lines are ignored:
```
# Bootstrap
bootstrap_no_changes = ✅  No changes to commit
bootstrap_source_repo = 📦  Source repo: {repo}

# Errors
error_gh_required = ❌  GitHub CLI (gh) is required — install it and authenticate with `gh auth login`
```

### Imports
```typescript
import { text, textFormat, beerLog } from "@text";
```

- **`text`** — `Record<string, string>` of all entries from `all.txt`.
- **`textFormat(template, values)`** — replaces `{key}` placeholders in a template.
- **`beerLog(key, values?)`** — logs a message to console with optional substitution.

### Usage
```typescript
// Static message
beerLog("bootstrap_no_changes");
// → ✅  No changes to commit

// With substitution
beerLog("bootstrap_source_repo", { repo: "owner/repo" });
// → 📦  Source repo: owner/repo

// Error messages
throw new Error(text["error_gh_required"]!);

// Error with placeholders
throw new Error(textFormat(text["error_output_dir_exists"]!, { dir: outputDir }));
```

### Rules
- Never hardcode user-facing strings inline; add them to `sources/text/all.txt`.
- Keys use underscore-separated names: `domain_description` (e.g., `bootstrap_no_changes`, `error_gh_required`, `prompt_source_repo`).
- Use `beerLog(key)` for console output instead of raw `console.log`.
- The build copies `all.txt` to `dist/text/` automatically.
