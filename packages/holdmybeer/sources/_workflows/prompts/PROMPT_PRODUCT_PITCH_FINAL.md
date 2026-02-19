You are refining a product pitch using a deep research report that validates and enriches the original claims. Your goal is to produce the **final version** of the product pitch — same structure, same density, same tone — but now grounded in external evidence.

## Context

- **Output File Path**: {outputPath}
- **Original source repository:** {sourceFullName} (Use a `gh` tool to look into issues)
- **Local checkout path:** {originalCheckoutPath}

**Input documents — read all before starting:**

- **Draft Product Pitch**: {productPitchPath} — the initial pitch you are refining. This is your starting structure.
- **Deep Research Report**: {deepResearchReportPath} — external validation and competitive analysis. Use this to strengthen, correct, or nuance claims in the draft.
- **Research Summary**: {researchPath} — original project analysis.
- **Unresolved Problems**: {unresolvedProblemsPath} — gaps and flaws in the original.
- **Key Decisions**: {decisionsPath} — decision catalog from the original.

## What to do

1. **Read the draft pitch.** This is your template. Preserve its structure, sections, and tone.
2. **Read the deep research report.** Extract:
   - Competitive landscape findings — update "The Problem" and "What the Original Got Wrong" with real competitors and comparisons
   - Market validation — if the report confirms the problem is real and widespread, cite the evidence
   - Technical validation — if architectural choices are confirmed as sound (or questioned), incorporate that
   - User evidence — if forums/discussions confirm pain points, weave that into relevant sections
3. **Refine each section** using the research:
   - Strengthen claims that the research supports with specific citations
   - Soften or remove claims the research contradicts
   - Add new insights the research revealed that the draft missed
   - Update the competitive landscape with real tool names and comparisons
4. **Keep the same frontmatter format** with an updated `deepResearchQuery` reflecting what further research would now be most valuable (post-refinement).

## Rules

- **Same structure.** Do not add or remove sections. The output must have the same headings as the draft.
- **Same density.** Same word limits per section. If the draft was 200 lines, the final should be 200 lines.
- **Same tone.** Confident, specific, slightly amused, dense. No corporate creep.
- **Evidence over assertion.** Where the research provides evidence, cite it. Where it contradicts the draft, fix the draft.
- **Still honest about the original.** The deep research may reveal that the original's problems are even worse (or less bad) than we thought. Update accordingly.
- **No product name.** Continue using "{Project Name}" as placeholder.
- **Banned words:** revolutionary, powerful, seamless, robust, cutting-edge, next-generation, best-in-class, blazing-fast, game-changing, disruptive, leverage.

## Output

Output only raw markdown with YAML frontmatter. No preamble, no explanation, no commentary outside the document structure.
