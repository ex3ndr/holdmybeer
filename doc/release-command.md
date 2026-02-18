# Release Command

Added a root `yarn release` flow that publishes the `holdmybeer` package.

## Flow

```mermaid
flowchart LR
  A[yarn release at repo root] --> B[yarn workspace holdmybeer run release]
  B --> C[assert git status --porcelain is empty]
  C --> D[yarn install --frozen-lockfile]
  D --> E[yarn test]
  E --> F[yarn build]
  F --> G[npm publish --access public]
```

## Files

- Root script: `package.json`
- Package script: `packages/holdmybeer/package.json`
- Release runner: `packages/holdmybeer/sources/release/releaseRun.ts`
- Text catalog entries: `packages/holdmybeer/sources/text/all.txt`
