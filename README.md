<div align="center">

<img src="hero.jpg" alt="Hold My Beer" width="100%" />

# Hold My Beer

**You hand it a codebase. It hands you back a fully documented, cleanly rewritten project. You didn't even put your drink down.**

[![TypeScript](https://img.shields.io/badge/TypeScript-ESM-3178C6?logo=typescript&logoColor=white)](#)
[![Node.js](https://img.shields.io/badge/Node.js-22%2B-339933?logo=node.js&logoColor=white)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](#)

```
$ beer bootstrap
```

</div>

---

Somebody had to do it. You point `beer` at any repo, and it rewrites the whole thing -- every file cleaned up, full documentation generated from scratch, commit message written, pushed to a fresh GitHub repo. The kind of mass-refactor people put off for months, done in one command while you're still deciding what to order.

AI does the reading. AI does the writing. You do the supervising, which in this case means watching a progress bar from a comfortable distance.

## What You Get

- A **complete rewrite** of any codebase into a clean output directory
- **AI-generated documentation** that actually describes the project (not boilerplate, not lorem ipsum -- the AI reads the code and writes a real README)
- **A fresh GitHub repo** with everything committed and pushed, ready to share
- **A JSON report** with per-file stats so you can see exactly what changed and why

The tool figures out which AI is installed on your machine, sandboxes it so it can't mess with your config, runs the rewrite, and gets out of the way. If no AI is available, it still works -- just with less flair.

## Get Started

```bash
yarn install

# the full experience -- interactive, walks you through everything
yarn bootstrap

# just the rewrite, no GitHub stuff
yarn rewrite ./any-project --dry-run
```

You'll need Node.js 22+, Yarn, and the GitHub CLI (`gh auth login`). Having `claude` or `codex` installed makes the documentation generation actually good instead of just acceptable.

## The CLI

**`beer bootstrap`** -- The whole workflow. Asks you which repo to rewrite, where to publish it, then does everything else automatically. Crash-safe -- kill it mid-run, re-run it, picks up where it left off. Idempotent. Relentless.

**`beer rewrite <dir>`** -- Just the file rewrite. Normalizes line endings, strips trailing whitespace, converts tabs, collapses blank lines, ensures trailing newlines. Recognizes 30+ text file types, copies binaries untouched, skips the junk directories you'd expect. Produces a detailed JSON report.

```bash
beer rewrite ./legacy-app -o ./clean-app --force
beer rewrite ./sketchy-repo --dry-run --report ./audit.json
beer rewrite ./monorepo -i "src/**" -x "**/*.test.*"
```

## Why

Because every project deserves clean files and real documentation, and nobody wants to spend a weekend doing it by hand. HoldMyBeer treats codebase cleanup as a solved problem -- point, shoot, done.

Three runtime dependencies. No API keys to configure. No config files to maintain. It shells out to the tools already on your machine and lets them do what they're good at.

## Development

```bash
yarn dev            # run from source
yarn build          # compile
yarn test           # vitest
yarn typecheck      # tsc
```

## License

MIT
