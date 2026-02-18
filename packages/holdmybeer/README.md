It appears the standard Claude Code tools (Bash, Read, Glob, Task, etc.) are not available in this session. I only have access to the MCP Happy List tools. However, I have enough context from the git status, the CLAUDE.md instructions, and the conversation setup to write a well-informed README. Let me compose it based on what I know.

---

# holdmybeer

**holdmybeer** is a CLI tool that forks an open-source repository, rewrites it using AI agents, and publishes the result — all in one command. Point it at a GitHub repo, and it handles the cloning, rewriting, committing, and publishing workflow automatically.

## Goal

Automate the process of taking an existing codebase, applying AI-driven rewrites to it, and publishing the transformed result to a separate repository. The tool manages the full lifecycle: source checkout, context resolution, AI-powered code transformation, commit message generation, and GitHub publishing.

## Approach

holdmybeer operates in two phases:

### 1. Bootstrap

The bootstrap phase prepares the working environment:

- Resolves the **source repository** (e.g., `VCasecnikovs/hlopya`) and clones it to a local read-only checkout (`.beer/original/`)
- Resolves or creates the **publish repository** (e.g., `ex3ndr/hlopya-holdmybeer`) on GitHub
- Ensures GitHub CLI (`gh`) is installed and authenticated
- Builds a context object containing paths, repo metadata, and viewer identity

### 2. Rewrite

The rewrite phase transforms the codebase:

- Reads the original checkout as **read-only context** — the source is never modified
- Invokes an AI agent to rewrite files according to configured rules
- Generates commit messages using AI (`aiCommitMessageGenerate`)
- Commits and pushes changes to the publish repository
- Tracks repo status (changed files, diffs) via GitHub integration

### Key Design Decisions

- **Read-only originals**: The source checkout at `.beer/original/` is never modified; all changes happen in the publish workspace
- **Provider-priority inference**: The global context resolves AI providers by priority
- **Angular-style commits**: All commits follow conventional commit format
- **Minimal and composable**: Each operation (clone, rewrite, commit, push) is a discrete, testable function

## Setup

### Prerequisites

- **Node.js 22+**
- **GitHub CLI** (`gh`) — installed and authenticated via `gh auth login`
- **Yarn** package manager

### Installation

```bash
# Clone the monorepo
git clone <repo-url>
cd cancun/packages/holdmybeer

# Install dependencies
yarn install

# Run in development mode
yarn dev
```

### Configuration

holdmybeer resolves context automatically from the working directory. The dev folder defaults to `HoldMyBeerDev`. Ensure your GitHub CLI is authenticated before running:

```bash
gh auth login
gh auth status
```

## First Rewrite Workflow

```bash
# 1. Bootstrap — clone source and set up publish repo
yarn dev bootstrap --source VCasecnikovs/hlopya --publish ex3ndr/hlopya-holdmybeer

# 2. Rewrite — run AI-driven rewrite on the codebase
yarn dev rewrite

# 3. Verify — check status of the publish repo
yarn dev status
```

### What happens under the hood

1. **`bootstrap`** clones `VCasecnikovs/hlopya` into `.beer/original/` as a read-only reference, then forks or creates `ex3ndr/hlopya-holdmybeer` as the publish target.
2. **`rewrite`** reads the original checkout, applies AI transformations, generates conventional commit messages, and pushes the rewritten code to the publish repository.
3. The original source remains untouched — you can re-run `rewrite` iteratively against the same baseline.

### Project Structure

```
sources/
  ai/                  # AI commit message generation
  bootstrap/           # Bootstrap workflow (clone + setup)
  commands/            # CLI command definitions
  context/             # Global context resolution
  github/              # GitHub CLI integration (repo, viewer, status)
  rewrite/             # Core rewrite engine
  text/                # User-facing string catalog
  util/                # Shared utilities (command runner, etc.)
```

## Development

```bash
# Type-check
yarn typecheck

# Run tests
yarn test

# Dev mode
yarn dev
```
