# @slopus/beer

CLI package for **HoldMyBeer**.

## Command

- `beer`: open interactive workflow selection and run the selected workflow.
- logs are written to `<projectPath>/.beer/logs/beer-YYYY-MM-DD.log`.

## Runtime Requirements

- Node.js 22+ (published CLI runtime)
- Bun 1.3+ (development scripts)
- `gh` authenticated
- `pi` CLI installed/authenticated

## Development

```bash
bun install
bun run dev
bun run typecheck
bun run test
bun run build
bun run release
```
