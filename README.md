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

## Install

```bash
npm install -g holdmybeer
```

You'll need Node.js 22+ and the GitHub CLI (`gh auth login`).

## Get Started

```bash
# set everything up
beer bootstrap

# do the actual work
beer now
```

### AI Providers

For the full experience you'll want all three subscriptions. Yes, all three. We said hold my beer, not hold my budget.

- **Claude** -- Anthropic
- **Codex** -- OpenAI
- **Antigravity** -- Antigravity

Auto-detected at startup. Works with one, better with two, unstoppable with three.

## The CLI

**`beer bootstrap`** -- Set everything up. Source repo, publish repo, README, first commit, pushed. Interactive, crash-safe, picks up where it left off. Run it, answer a few questions, walk away.

**`beer now`** -- Do the actual work. Takes the original codebase, hands it to the best available model, and rewrites the entire thing from scratch. New code, new docs, same intent. This is the whole point.

## Why

AI models get meaningfully better every six months. The code you wrote with last generation's model is already behind what today's model would produce from scratch. Instead of patching and accruing tech debt, HoldMyBeer takes the opposite approach -- full rewrite, every cycle, from the ground up. The original codebase is preserved as context so nothing is lost, but the output is always written by the best model available right now.

Think of it as planned obsolescence, except you're the one in control and the replacement is always better.

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
