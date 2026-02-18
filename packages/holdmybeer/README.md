# @slopus/beer

CLI package for **HoldMyBeer**.

## Command

- `beer`: open interactive workflow selection.
- `beer bootstrap`: initialize settings, resolve source/publish repos, generate README + commit message via inference, then push to `main`.
- `beer ralph-loop`: ask what to build, generate a plan, execute implementation, then run 3 inference review rounds.

## Runtime Requirements

- Node.js 22+
- `gh` authenticated
- `pi` CLI installed/authenticated

## Development

```bash
yarn install
yarn dev
yarn typecheck
yarn test
yarn build
yarn release
```
