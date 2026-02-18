You are writing a README.md for an open-source project.

This repository is a clean copy produced by [HoldMyBeer](https://github.com/ex3ndr/holdmybeer).

## Context

- **Original source repository:** {sourceFullName}
- **Published repository:** {publishFullName}
- **Local checkout of the original:** {originalCheckoutPath}

Read the local checkout thoroughly — source code, existing README, package metadata, config files, tests, examples — to understand what the project actually does. Do not modify any files.

## README requirements

Write a comprehensive README that treats this as a real, usable project. The focus is on **what the project does, how to use it, and why it matters**. The HoldMyBeer origin is a small footnote, not the headline.

### Structure

1. **Title**
   - Project name as H1 (derive from the original repo)
   - One-line description of what the project does — focus on the user benefit
   - Small note below: `> 🍺 Clean copy of [{sourceFullName}](https://github.com/{sourceFullName}) via [HoldMyBeer](https://github.com/ex3ndr/holdmybeer)`

2. **Overview**
   - 3–5 sentences explaining the project's purpose
   - What problem does it solve? Who is it for? Why does it exist?
   - Read the original code and README deeply — understand the domain, not just the tech
   - If the project has a logo, tagline, or mission statement, incorporate it naturally

3. **Key features**
   - Bulleted list of the project's main capabilities
   - Extract from actual code: exports, CLI commands, API surface, config options, supported formats
   - Be specific ("Supports PostgreSQL, MySQL, and SQLite") not generic ("Supports multiple databases")
   - Group related features if there are many

4. **Quick start**
   - The fastest path from zero to working
   - Prerequisites (runtime version, system deps)
   - Install and run in 3–5 copy-pasteable commands
   - Show expected output if helpful

5. **Usage**
   - 3–5 concrete examples covering the most common workflows
   - CLI tools: show commands with flags and expected output
   - Libraries: show import, initialization, and typical API calls
   - Servers/apps: show how to start, configure, and interact
   - Use realistic values in examples, not `foo`/`bar`

6. **API reference** (if it's a library)
   - Document the main public API surface
   - Function signatures, parameters, return types
   - Keep it concise — cover the top 5–10 most used functions/classes
   - Skip this section entirely for CLI tools or apps

7. **Configuration**
   - Environment variables, config files, CLI flags
   - Show defaults and valid values
   - Only include if the project actually has configuration
   - Skip this section if there's nothing to configure

8. **Project structure**
   - Brief directory tree of the main folders
   - One-line description of each folder's purpose
   - Only top-level and key subdirectories — not every file
   - Skip for very small projects (< 10 files)

9. **Development**
   - How to set up a dev environment
   - How to run tests, lint, build
   - Derive from actual scripts in package.json / Makefile / equivalent

10. **Tech stack**
    - Language, runtime, framework, key dependencies
    - Derive from package.json, Cargo.toml, go.mod, requirements.txt, or equivalent
    - Keep it brief — a short list, not paragraphs

11. **License**
    - Match the original repository's license exactly
    - If no license file exists, state: "License follows the original repository"

12. **Acknowledgments**
    - Credit the original project: `Based on [{sourceFullName}](https://github.com/{sourceFullName})`
    - Clean copy produced by [HoldMyBeer](https://github.com/ex3ndr/holdmybeer)
    - Keep this to 2–3 lines maximum

### Style

- Focus on **what the project does**, not on HoldMyBeer internals or generation process
- Write for someone who found this repo and wants to use it — not someone who cares how it was made
- Clear, direct English — no filler, no hype, no "powerful" or "blazing fast"
- Present tense: "Parses JSON" not "Will parse JSON"
- Code blocks must specify language for syntax highlighting
- Length: 150–400 lines — thorough but not padded
- ATX headings, fenced code blocks, `-` for unordered lists
- Only document what exists in the code — never invent features
- No CI/coverage/npm badges unless the original had them
- No table of contents

### Output

Output only raw markdown. No preamble, no explanation.
