# Context Settings ApplyConfig

`Context` owns the settings lifecycle. Workflows read `ctx.settings` and update settings only via `ctx.applyConfig(update)`.

## Flow

```mermaid
flowchart TD
  A[Context.create(folder)] --> B[beerSettingsRead]
  B --> C[freeze snapshot to ctx.settings]
  D[workflow reads ctx.settings] --> C
  E[ctx.applyConfig(update)] --> F[clone current settings]
  F --> G[run update callback]
  G --> H[set updatedAt]
  H --> I[beerSettingsWrite]
  I --> J[freeze snapshot to ctx.settings]
```

## Notes

- `ctx.settings` is exposed as read-only and backed by a frozen snapshot.
- `ctx.applyConfig(...)` returns `void`; it updates in-memory settings and persists to `.beer/settings.json`.
- Bootstrap and main flow now read settings from `ctx` instead of reading the settings file directly.
