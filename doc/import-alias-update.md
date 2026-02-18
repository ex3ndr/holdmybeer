# Import Alias Update

Internal source imports now use the `@/` alias instead of relative paths.

## Resolution

```mermaid
flowchart LR
  A["@/modules/..."] --> B["sources/modules/..."]
  C["@/apps/..."] --> D["sources/apps/..."]
  E["@/commands/..."] --> F["sources/commands/..."]
```

- Updated `sources/**/*.ts` imports from relative paths to `@/...`.
- Added `@/* -> ./sources/*` in TypeScript paths.
- Added Vitest alias resolution for `@/`.
