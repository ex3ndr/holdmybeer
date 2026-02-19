# Plan Workflow: Task Tree Builder

The `plan` workflow builds a persisted implementation-task tree using blueprint and product documentation.

## Flow

```mermaid
flowchart TD
  A[user selects plan workflow] --> B[resolve source documents]
  B --> C{any sources found?}
  C -- no --> D[throw error_plan_sources_required]
  C -- yes --> E[treeSearchRun root: doc/plan-tree]
  E --> F[Phase 1 root walk]
  F --> G[Phase 2 guided leaf expansion]
  G --> H[read tree state + render outline]
  H --> I[write doc/plan-tree.md summary]
```

## Prompting Model

```mermaid
graph TD
  A[planPromptRoot] --> B[top-level workstreams]
  C[planPromptDocument] --> D[node document.md]
  E[planPromptChildren] --> F[node children.json]
  G[planPromptPicker] --> H[next leaf path]
```

## Outputs

- Persisted tree root: `doc/plan-tree/`
- Node artifacts:
  - `node.json`
  - `document.md`
  - `children.json`
- Human summary: `doc/plan-tree.md`
