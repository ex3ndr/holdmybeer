# Release Command

Added a root `yarn release` flow that publishes the `holdmybeer` package.

## Flow

```mermaid
flowchart LR
  A[yarn release at repo root] --> B[yarn workspace @slopus/beer run release]
  B --> C[assert git status --porcelain is empty]
  C --> D[choose next version patch/minor/major/custom]
  D --> E[npm version X.Y.Z --no-git-tag-version]
  E --> F[git commit release version]
  F --> G[yarn test]
  G --> H[yarn build]
  H --> I[git tag holdmybeer@X.Y.Z]
  I --> J[npm publish --access public]
  J --> K[git push origin HEAD]
  K --> L[git push origin holdmybeer@X.Y.Z]
```

## Files

- Root script: `package.json`
- Package script: `packages/holdmybeer/package.json`
- Release runner: `packages/holdmybeer/sources/release/releaseRun.ts`
- Version mode prompt: `packages/holdmybeer/sources/release/releaseVersionPrompt.ts`
- Semver increment helper: `packages/holdmybeer/sources/release/releaseVersionIncrement.ts`
- Text catalog entries: `packages/holdmybeer/sources/text/all.txt`

## CLI Usage

- Interactive: `yarn release`
- Non-interactive: `yarn release -- <patch|minor|major|custom> [version]`
