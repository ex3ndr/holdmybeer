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

Inference is fail-fast: if provider execution fails, bootstrap fails.

## Install

```bash
npm install -g @slopus/beer
```

Requirements:

- Node.js 22+
- GitHub CLI authenticated (`gh auth login`)
- `pi` CLI installed and authenticated

## CLI

```bash
beer [--project <path>]
```

## Development

```bash
yarn install
yarn dev
yarn typecheck
yarn test
yarn build
yarn release
```

## License

MIT
