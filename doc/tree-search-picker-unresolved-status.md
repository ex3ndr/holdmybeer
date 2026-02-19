# Tree Search Picker Unresolved Status

When picker inference cannot resolve a valid leaf while unexpanded leaves still exist, tree search now emits an explicit status message before stopping.

## Flow

```mermaid
flowchart TD
  A[Dispatcher asks treeLeafPick] --> B{leaf returned?}
  B -- yes --> C[Dispatch expansion]
  B -- no --> D{unexpanded leaves remain?}
  D -- no --> E[Stop normally]
  D -- yes --> F[Status: picker unresolved]
  F --> G[Stop gracefully]
```

## Message

- `tree_search_picker_unresolved`
- Text: `Picker could not select a valid leaf; stopping.`
