<div align="center">

<img src="hero.jpg" alt="Hold My Beer" width="100%" />

# Hold My Beer

Bootstrap and publish a rewritten project using one command.

```bash
$ beer
```

</div>

---

## What It Does

`beer` opens a workflow selector and then runs the selected workflow.

The `bootstrap` workflow:

- detects the local inference provider (`pi`) and available models
- saves bootstrap settings under `~/Developer/HoldMyBeerDev/.beer/settings.json`
- resolves source and publish GitHub repositories
- checks out source into `<projectPath>/.beer/original`
- generates `README.md` and an initial commit message via inference
- commits and pushes to `origin/main`
- writes logs to `<projectPath>/.beer/logs/beer-YYYY-MM-DD.log`

Inference is fail-fast: if provider execution fails, bootstrap fails.

## Install

```bash
npm install -g @slopus/beer
```

Requirements:

- Node.js 22+ (for published CLI runtime)
- Bun 1.3+ (for repository development scripts)
- GitHub CLI authenticated (`gh auth login`)
- `pi` CLI installed and authenticated

## CLI

```bash
beer [--project <path>]
```

## Development

```bash
bun install
bun run dev
bun run typecheck
bun run test
bun run build
bun run release
```

## License

MIT
