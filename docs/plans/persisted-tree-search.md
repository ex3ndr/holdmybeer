# Persisted Tree Search Harness

## Overview
Build a general-purpose persisted tree search harness with LLM-guided leaf selection. The search proceeds in two phases:

**Phase 1 — Root walk**: A root prompt generates an exhaustive first level of children. ALL level-1 nodes are fully researched (document + children list) with concurrency.

**Phase 2 — Guided search**: A single dispatcher loop picks the next unexpanded leaf via an LLM "picker" call that sees the full tree outline. The picked leaf is dispatched for research. Up to 4 research operations run concurrently. When a slot frees up, the dispatcher picks the next leaf. Continues until no unexpanded leaves remain (or depth limit).

Key properties:
- **Root has no document** — only children
- **Every non-root node** gets a dedicated `document.md` with frontmatter
- **Two-call session pattern per node**: (1) generate document, (2) generate children list — same session
- **Session forking**: each node stores its sessionId; researching a child forks from the parent's session
- **LLM-guided search order**: a "picker" inference call sees the full tree as a text outline (titles + status) and selects the most important unexpanded leaf
- **Persisted & resumable**: skip nodes where `document.md` + `children.json` both exist
- **Concurrency 4 (default)**: up to 4 leaf-research operations in parallel

## Context (from discovery)
- `generateSessionCreate()` provides session continuity between calls — accepts optional `sessionId` to fork from (`sources/modules/ai/generateSessionCreate.ts`)
- `generateFile()` handles file generation with retries and frontmatter verification (`sources/modules/ai/generateFile.ts`)
- `generateText()` handles text generation with output tag extraction (`sources/modules/ai/generateText.ts`)
- `generateFrontmatter()` validates frontmatter against Zod schemas (`sources/_workflows/steps/generateFrontmatter.ts`)
- `generate()` is the core inference engine with sandbox, provider selection, and retry logic (`sources/modules/ai/generate.ts`)
- `AsyncLock` exists in `sources/modules/util/asyncLock.ts`
- `PathLock` exists in `sources/modules/util/pathLock.ts`
- Project uses prefix naming, one-function-per-file, `@/types` for shared types

## Filesystem Layout
```
<root-dir>/                     # caller-provided directory
  children.json                 # [{title, slug}, ...]
  topic-a/
    node.json                   # {title, slug, sessionId, status}
    document.md                 # generated with frontmatter
    children.json               # [{title, slug}, ...]
    subtopic-1/
      node.json
      document.md
      children.json             # [] (empty = leaf)
    subtopic-2/
      node.json
      document.md
      children.json
  topic-b/
    node.json
    document.md
    children.json               # [] (leaf)
```

## Development Approach
- **Testing approach**: Regular (code first, then tests)
- Complete each task fully before moving to the next
- Make small, focused changes
- **CRITICAL: every task MUST include new/updated tests** for code changes in that task
- **CRITICAL: all tests must pass before starting next task**
- **CRITICAL: update this plan file when scope changes during implementation**
- Run tests after each change

## Progress Tracking
- Mark completed items with `[x]` immediately when done
- Add newly discovered tasks with ➕ prefix
- Document issues/blockers with ⚠️ prefix

## Implementation Steps

### Task 1: Add tree search types
- [x] Create `sources/modules/tree/treeSearchTypes.ts` with core types:
  - `TreeSearchConfig` — rootDir, rootPrompt, concurrency (default 4), maxDepth (default 4), modelSelectionMode, optional frontmatterSchema (Zod), prompt builder callbacks (documentPrompt, childrenPrompt, pickerPrompt)
  - `TreeNode` — slug, title, depth, dirPath, parentDirPath, sessionId (from research), status (`unexpanded` | `in-progress` | `expanded` | `leaf`)
  - `TreeChildEntry` — `{ title: string; slug: string }` (what goes in children.json)
  - `TreeNodeDisk` — `{ title: string; slug: string; sessionId?: string; status: string }` (what goes in node.json)
  - `TreeSearchResult` — total nodes expanded, total leaves, total skipped
- [x] Re-export cross-cutting types from `sources/types.ts`
- [x] Write tests for type imports (smoke test)
- [x] Run tests — must pass before next task

### Task 2: Add slug generation utility
- [x] Create `sources/modules/tree/treeNodeSlug.ts` — converts a title string to a filesystem-safe slug (lowercase, hyphens, no special chars, max 60 chars, dedup hyphens)
- [x] Write tests for `treeNodeSlug` (spaces, special chars, unicode, empty string, very long strings, trailing hyphens)
- [x] Run tests — must pass before next task

### Task 3: Add node persistence (children.json + node.json)
- [x] Create `sources/modules/tree/treeChildrenRead.ts` — reads `children.json` from a node directory, returns `TreeChildEntry[]`, returns `null` if missing
- [x] Create `sources/modules/tree/treeChildrenWrite.ts` — writes `TreeChildEntry[]` to `children.json` (atomic via temp + rename)
- [x] Create `sources/modules/tree/treeNodeRead.ts` — reads `node.json` from a node directory, returns `TreeNodeDisk`, returns `null` if missing
- [x] Create `sources/modules/tree/treeNodeWrite.ts` — writes `TreeNodeDisk` to `node.json` (atomic via temp + rename)
- [x] Write tests for all four (file exists, file missing, malformed JSON, overwrites, creates parent dirs)
- [x] Run tests — must pass before next task

### Task 4: Add tree state management
- [x] Create `sources/modules/tree/treeStateRead.ts` — recursively reads the tree from disk into an in-memory structure: walks root `children.json`, for each child reads `node.json` + `children.json`, recurses. Returns a `TreeNode` tree (or flat list).
- [x] Create `sources/modules/tree/treeStateRender.ts` — renders the in-memory tree as a text outline for the picker LLM call:
  ```
  - Authentication System [expanded]
    - OAuth2 Flow [unexpanded]
    - Session Management [in-progress]
    - Password Hashing [leaf]
  - Database Layer [expanded]
    - Query Optimization [unexpanded]
    - Migration System [unexpanded]
  ```
- [x] Create `sources/modules/tree/treeStateLeaves.ts` — collects all unexpanded leaves (nodes with status `unexpanded` whose parent is `expanded`) from the tree
- [x] Write tests for `treeStateRead` (empty tree, single level, nested, missing files)
- [x] Write tests for `treeStateRender` (correct indentation, status labels)
- [x] Write tests for `treeStateLeaves` (finds correct leaves, ignores in-progress and expanded)
- [x] Run tests — must pass before next task

### Task 5: Add tree node expansion (document + children via forked session)
- [x] Create `sources/modules/tree/treeNodeExpand.ts` — the core per-node research logic:
  1. Read `node.json` — if status is `expanded` or `leaf`, skip (return existing children from `children.json`)
  2. Resolve parent's sessionId from parent's `node.json` (root children have no parent session)
  3. Create session via `generateSessionCreate(ctx, { sessionId: parentSessionId })` — this forks from parent
  4. Call 1: Use `generate()` through the session with file output mode to produce `document.md` at `node.dirPath/document.md` (write-whitelist, frontmatter validation if schema provided)
  5. Call 2: Use `session.generate()` in text mode asking for children as JSON array of `{title, slug}`. Verify output via Zod.
  6. Write `children.json` to disk
  7. Update `node.json` with sessionId from session + status `expanded` (or `leaf` if children is empty)
  8. Return the parsed children list + create child directories with `node.json` (status `unexpanded`)
- [x] Write tests for `treeNodeExpand` — verify two-call session flow, verify sessionId forking from parent, verify file writes, verify skip logic for already-expanded nodes
- [x] Run tests — must pass before next task

### Task 6: Add LLM leaf picker
- [x] Create `sources/modules/tree/treeLeafPick.ts` — the picker inference call:
  1. Read tree state from disk via `treeStateRead`
  2. Render tree outline via `treeStateRender`
  3. Collect unexpanded leaves via `treeStateLeaves`
  4. If no unexpanded leaves → return `null` (search complete)
  5. Build picker prompt: shows tree outline + asks model to select ONE unexpanded leaf by its path, returning the slug path in `<output>` tags
  6. Call `generateText()` with the picker prompt
  7. Parse the model's response to identify the selected leaf path
  8. Return the `TreeNode` for the selected leaf
- [x] Handle edge case: picker returns a node that is already in-progress (another concurrent worker grabbed it) — retry with updated state
- [x] Write tests for `treeLeafPick` — verify prompt includes tree outline, verify correct leaf is returned, verify null when no leaves remain
- [x] Run tests — must pass before next task

### Task 7: Add dispatcher (main orchestrator)
- [x] Create `sources/modules/tree/treeSearchRun.ts` — the main entry point:
  1. Accept `TreeSearchConfig` + `Context`
  2. Create root directory if needed
  3. **Phase 1 — Root walk**:
     a. Generate children list from root prompt (text mode, no document for root)
     b. Write root `children.json`
     c. Create child directories with `node.json` (status `unexpanded`)
     d. Expand ALL level-1 children with concurrency limit (semaphore-limited `Promise.all` / pool)
  4. **Phase 2 — Guided search loop**:
     a. While there are unexpanded leaves AND depth < maxDepth:
        - If a concurrency slot is free → call `treeLeafPick()` to select next leaf
        - If picker returns `null` → wait for in-flight operations, then done
        - Mark selected leaf as `in-progress` in its `node.json`
        - Dispatch `treeNodeExpand()` for the leaf (runs in background)
        - When expand completes: create child `node.json` files (status `unexpanded`), free concurrency slot
     b. Wait for all in-flight operations to complete
  5. Return `TreeSearchResult` with stats
- [x] Implement concurrency control: simple slot counter + promise queue (or reuse semaphore from earlier)
- [x] Write tests for `treeSearchRun` — mock `generate`, verify Phase 1 expands all root children, verify Phase 2 dispatches guided picks, verify concurrency limit, verify max depth, verify resumability
- [x] Run tests — must pass before next task

### Task 8: Add text catalog entries
- [x] Add text entries to `sources/text/all.txt` for tree search progress messages:
  - `tree_search_root_expanding` — "Generating root children..."
  - `tree_search_root_walk` — "Walking root level: {title} ({current}/{total})"
  - `tree_search_picking_leaf` — "Picking next leaf to research..."
  - `tree_search_expanding_node` — "Researching: {title} (depth {depth})"
  - `tree_search_node_skipped` — "Skipped (cached): {title}"
  - `tree_search_depth_limit` — "Depth limit reached: {title}"
  - `tree_search_complete` — "Tree search complete: {expanded} expanded, {leaves} leaves, {skipped} skipped"
- [x] Run text codegen if needed
- [x] Update `treeSearchRun.ts`, `treeNodeExpand.ts`, `treeLeafPick.ts` to use text catalog entries for progress output via `ctx.progress()`
- [x] Run tests — must pass before next task

### Task 9: Verify acceptance criteria
- [x] Verify Phase 1: root walk expands all level-1 children with concurrency
- [x] Verify Phase 2: dispatcher uses LLM picker to select leaves, respects concurrency 4
- [x] Verify session forking: child sessions carry parent's sessionId
- [x] Verify nested directory structure with `document.md` + `children.json` + `node.json` per node
- [x] Verify root has no `document.md`, only `children.json`
- [x] Verify max depth stops expansion
- [x] Verify resumability (pre-existing expanded nodes are skipped)
- [x] Verify frontmatter validation works when schema is provided
- [x] Verify `in-progress` status prevents picker from selecting same node twice
- [x] Run full test suite (unit tests)
- [x] Run linter — all issues must be fixed

### Task 10: [Final] Update documentation
- [x] Add doc in `doc/` explaining the tree search harness with mermaid diagrams:
  - Overall two-phase flow
  - Session forking diagram
  - Dispatcher concurrency model
- [x] Document the `TreeSearchConfig` options and filesystem layout

## Technical Details

### Data Structures

**`TreeSearchConfig`:**
```typescript
interface TreeSearchConfig {
  rootDir: string;                          // absolute path to root directory
  rootPrompt: string;                       // initial prompt for root children generation
  concurrency?: number;                     // default 4
  maxDepth?: number;                        // default 4
  modelSelectionMode?: ProviderModelSelectionMode;
  frontmatterSchema?: ZodTypeAny;           // optional Zod schema for document frontmatter
  documentPrompt: (node: TreeNode) => string;   // builds the doc generation prompt per node
  childrenPrompt: (node: TreeNode) => string;   // builds the children list prompt per node
  pickerPrompt?: (treeOutline: string, leaves: TreeNode[]) => string;  // builds the picker prompt
}
```

**`TreeNode`:**
```typescript
interface TreeNode {
  slug: string;
  title: string;
  depth: number;
  dirPath: string;          // absolute path to this node's directory
  parentDirPath: string;    // absolute path to parent directory
  sessionId?: string;       // from when this node was researched
  status: "unexpanded" | "in-progress" | "expanded" | "leaf";
  children: TreeNode[];     // populated when reading tree state
}
```

**`TreeChildEntry`:**
```typescript
interface TreeChildEntry {
  title: string;
  slug: string;
}
```

**`node.json` format:**
```json
{
  "title": "Authentication System",
  "slug": "authentication-system",
  "sessionId": "sess_abc123",
  "status": "expanded"
}
```

**`children.json` format:**
```json
[
  { "title": "OAuth2 Flow", "slug": "oauth2-flow" },
  { "title": "Session Management", "slug": "session-management" }
]
```

### Two-Phase Flow
```
treeSearchRun(ctx, config)
  │
  ├─ Phase 1: Root Walk
  │   ├─ Root prompt → generateText() → parse children list
  │   ├─ Write rootDir/children.json
  │   ├─ Create child dirs with node.json (status: unexpanded)
  │   └─ Expand ALL level-1 children (concurrency-limited):
  │       └─ treeNodeExpand(ctx, child, config)
  │           ├─ Fork session from parent (root has no parent session)
  │           ├─ Call 1: generate document.md (file mode)
  │           ├─ Call 2: generate children list (text mode, same session)
  │           ├─ Write children.json + update node.json (expanded/leaf)
  │           └─ Create grandchild dirs with node.json (unexpanded)
  │
  └─ Phase 2: Guided Search
      └─ Dispatcher loop:
          ├─ Slot free? → treeLeafPick(ctx, config)
          │   ├─ Read tree state from disk
          │   ├─ Render as text outline
          │   ├─ LLM selects one unexpanded leaf
          │   └─ Return selected TreeNode
          ├─ Mark leaf in-progress (node.json)
          ├─ Dispatch treeNodeExpand() (background)
          │   └─ (same as above, but forks from parent's sessionId)
          └─ On completion: create child node.json files, free slot
```

### Session Forking
```
Root (no session)
├─ Auth System (sess_A)  ← forked from nothing (root)
│   ├─ OAuth2 (sess_B)   ← forked from sess_A
│   └─ Sessions (sess_C) ← forked from sess_A
└─ Database (sess_D)     ← forked from nothing (root)
    └─ Queries (sess_E)  ← forked from sess_D
```

### Picker LLM Prompt Structure
```
You are a research planner analyzing a tree of topics being explored.
Here is the current state of the research tree:

- Authentication System [expanded]
  - OAuth2 Flow [unexpanded]
  - Session Management [in-progress]
  - Password Hashing [leaf]
- Database Layer [expanded]
  - Query Optimization [unexpanded]
  - Migration System [unexpanded]

Select the ONE most important unexpanded leaf to research next.
Consider: coverage gaps, dependencies between topics, foundational vs advanced.

Return ONLY the slug path of the selected leaf inside <output> tags.
Example: <output>authentication-system/oauth2-flow</output>
```

### File Map
```
sources/modules/tree/
  treeSearchTypes.ts          # all types
  treeNodeSlug.ts             # title → slug
  treeNodeSlug.spec.ts
  treeChildrenRead.ts         # read children.json
  treeChildrenRead.spec.ts
  treeChildrenWrite.ts        # write children.json
  treeChildrenWrite.spec.ts
  treeNodeRead.ts             # read node.json
  treeNodeRead.spec.ts
  treeNodeWrite.ts            # write node.json
  treeNodeWrite.spec.ts
  treeStateRead.ts            # recursive tree → in-memory
  treeStateRead.spec.ts
  treeStateRender.ts          # tree → text outline
  treeStateRender.spec.ts
  treeStateLeaves.ts          # collect unexpanded leaves
  treeStateLeaves.spec.ts
  treeNodeExpand.ts           # per-node: doc + children via forked session
  treeNodeExpand.spec.ts
  treeLeafPick.ts             # LLM picker: select next leaf
  treeLeafPick.spec.ts
  treeSearchRun.ts            # main orchestrator (two-phase)
  treeSearchRun.spec.ts
```

## Post-Completion

**Manual verification:**
- Run tree search against a real prompt to verify end-to-end document quality
- Verify the LLM picker makes sensible choices about research order
- Verify session forking provides meaningful context continuity
- Check that generated frontmatter is valid across all nodes
- Stress-test concurrency with higher limits
- Verify resumability after interruption mid-search
