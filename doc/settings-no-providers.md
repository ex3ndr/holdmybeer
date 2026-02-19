# Settings No Providers

Provider detections remain runtime-only in `Context` and are no longer persisted to `.beer/settings.json`.

## Flow

```mermaid
flowchart TD
  A[Context.create(folder)] --> B[providerDetect]
  B --> C[ctx.providers in memory]
  C --> D[ctx.settings in memory]
  D --> E[source/publish/commit fields only]
  E --> F[ctx.applyConfig writes settings]
  F --> G[providers key is not written]
```

## Notes

- Removed `providers` from `BeerSettings`.
- `beerSettingsRead` strips legacy `providers` keys when present.
- Bootstrap reads `ctx.settings` and no longer writes `ctx.providers` into settings.
