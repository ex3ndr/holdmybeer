# holdmybeer

`holdmybeer` is a TypeScript CLI workspace with a single package at `packages/holdmybeer`.

Current baseline:
- `bootstrap` flow to initialize `.beer/settings.json`
- GitHub source + publish repository resolution via `gh`
- local provider detection (`claude`, `codex`)
- generated initial `README.md` and initial commit message using provider priority
- push to selected GitHub repository
- baseline deterministic `rewrite` command

## Quick start

```bash
yarn install
yarn dev bootstrap
yarn dev rewrite ../some-codebase --dry-run
yarn dev:run
```

## Scripts

- `yarn build`
- `yarn dev`
- `yarn dev:run`
- `yarn bootstrap`
- `yarn rewrite`
- `yarn test`
- `yarn typecheck`
