You are naming a software product. This is harder than it sounds — a good name is memorable, short, available, and captures the essence of what the tool does without being generic. And in this case, it should make someone smile.

## Context

- **Output File Path**: {outputPath}
- **Original source repository:** {sourceFullName}
- **Local checkout path:** {originalCheckoutPath}

**Input documents — read all before starting:**

- **Product Pitch**: {productPitchPath} — the complete product description. Understand what this tool does, who it's for, and what makes it distinctive.
- **Research Summary**: {researchPath} — technical analysis of the original project.
- **Key Decisions**: {decisionsPath} — architectural and design decisions.

## Research before naming

Before you pick a name, you MUST research the competitive landscape. Use the `gh` tool and web search to:

1. **Find existing tools in the same space.** AI-powered code generation, project scaffolding, AI workflow orchestration, repository bootstrap tools. List every competitor you find.
2. **Catalog their names.** What naming patterns do they use? What's overused? (hint: everything with "ai", "co", "pilot", "gen", "auto" in the name is exhausted)
3. **Check npm for collisions.** Before finalizing, verify the name isn't already taken on npm. Use `npm search {name}` or check `https://www.npmjs.com/package/{name}`.
4. **Check GitHub for collisions.** Search for repos with the candidate name.
5. **Check domain availability.** For your top candidates, check if `{name}.dev`, `{name}.io`, or `{name}.com` are available and affordable (under $5k). Use WHOIS lookups or domain search tools. A name with an available domain under $5k is strongly preferred over one without.

Include a "## Competitive landscape" section in your output showing what you found.

## The vibe

The name must be **goofy**. Not corporate-goofy like "Sagemaker" or startup-goofy like "Humane." Actually funny. The kind of name that makes a developer do a double-take, chuckle, and then remember it forever.

Think about names like:
- **yeet** — you wouldn't forget a CLI tool called yeet
- **bonk** — it just sounds fun to type in a terminal
- **lmao** — irreverent but memorable
- **oops** — self-aware humor
- **bruh** — internet culture meets developer tooling
- **yolo** — the attitude of running AI code generation on your repo

The name should feel like something you'd say right before doing something bold with your codebase. It should match the product's personality: confident, slightly unhinged, technically serious underneath the humor. The kind of name where the README makes you laugh but the tool makes you productive.

**Do NOT pick any of the example names above.** They're just illustrations of the vibe. Find your own.

## What to produce

Generate a YAML frontmatter with the chosen product name and rationale, followed by a brief markdown body.

```
---
productName: "{the chosen name}"
---

# Naming: {the chosen name}

## Competitive landscape

| Tool | What it does | Name style |
|------|-------------|------------|
| {tool} | {description} | {serious/playful/generic/etc} |
(list all competitors found)

{1-2 sentences on naming patterns in this space and what's overused.}

## Why this name

{2-3 sentences. Why this name is funny, memorable, and fits. What it evokes. Why a developer would grin the first time they type it in a terminal.}

## Considered alternatives

| Name | Why considered | Why rejected |
|------|---------------|--------------|
| {name} | {reason} | {reason} |
(5-10 alternatives, at least half should be goofy)

## Name properties

- **Memorable:** {yes/no and why}
- **Goofy factor:** {what makes it funny}
- **Short:** {character count, syllable count}
- **Domain-friendly:** {would work as productname.dev or similar}
- **CLI-friendly:** {works as a terminal command — short, no special chars, fun to type}
- **Searchable:** {not a common English word that pollutes search results}
- **npm available:** {yes/no — did you check?}
- **Domain available:** {which domains checked, which are available, estimated price}
```

## Naming rules

- **Max 12 characters.** Shorter is better. 4-8 is ideal.
- **Must be goofy.** If it doesn't make someone smile, try again. The humor can be subtle or obvious, but it must be there.
- **Lowercase-friendly.** Must work as a CLI command and npm package name.
- **No generic words.** "devtool", "aihelper", "codebot" — these are descriptions, not names.
- **No forced acronyms.** If it doesn't spell naturally, don't force it.
- **No "AI" in the name.** Every tool has AI now. It's not a differentiator, it's a commodity. Putting "ai" in your name is like putting "electric" in a car name in 2026.
- **Evocative over descriptive.** The name should hint at what the tool feels like to use, not literally describe its function.
- **Actually check for collisions.** Search npm and GitHub. A name that's already taken is not an option no matter how good it is.
- **Domain matters.** Strongly prefer names where `{name}.dev`, `{name}.io`, or `{name}.com` is available for under $5k. A great name without a domain is worse than a good name with one.
- **Consider the terminal experience.** `$ {name} bootstrap` — does it feel good to type? Does it make the developer smile every time?

## Output

Output only raw markdown with YAML frontmatter. No preamble, no explanation.
