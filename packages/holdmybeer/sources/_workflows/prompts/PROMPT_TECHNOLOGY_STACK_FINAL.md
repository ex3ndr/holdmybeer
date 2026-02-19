You are refining a technology stack recommendation using a deep research report that validates and enriches the original analysis. Your goal is to produce the **final version** of the technology stack document — same structure, same density, same rigor — but now grounded in external benchmarks, ecosystem data, and community evidence.

## Context

- **Output File Path**: {outputPath}
- **Original source repository:** {sourceFullName} (Use a `gh` tool to look into issues)
- **Local checkout path:** {originalCheckoutPath}
- **Product name:** {productName}

**Input documents — read all before starting:**

- **Draft Technology Stack**: {technologyStackPath} — the initial stack recommendation you are refining. This is your starting structure.
- **Deep Research Report**: {deepResearchReportPath} — external validation, benchmarks, and ecosystem analysis. Use this to strengthen, correct, or nuance recommendations in the draft.
- **Research Summary**: {researchPath} — original project analysis.
- **Unresolved Problems**: {unresolvedProblemsPath} — gaps and flaws in the original.
- **Key Decisions**: {decisionsPath} — decision catalog from the original.
- **Product Pitch**: {productPitchPath} — the product we are building this stack for.

## What to do

1. **Read the draft stack.** This is your template. Preserve its structure, sections, and evaluation methodology.
2. **Read the deep research report.** Extract:
   - Benchmark data — if the report has performance comparisons for recommended tools, update the evaluations with real numbers
   - Ecosystem updates — if adoption trends, maintainer activity, or migration waves are documented, incorporate them
   - Agent compatibility evidence — if the report confirms (or questions) tool suitability for AI-agent workflows, update accordingly
   - Known issues — if recent breaking changes, regressions, or community complaints are documented, address them in risk assessments
   - Alternative tools — if the research surfaces tools the draft missed, evaluate and either add or document why they were rejected
3. **Refine each section** using the research:
   - Update ecosystem data (downloads, stars, contributors) with the latest numbers from the research
   - Strengthen recommendations that the research supports with specific citations
   - Reconsider recommendations that the research contradicts — change them if the evidence is compelling
   - Update the comparison matrices with any new scoring data
   - Revise risk assessments based on new bus factor, funding, or migration path information
4. **Strip the frontmatter.** The draft stack has YAML frontmatter — do NOT include it in the final version. The final stack document is clean markdown, no frontmatter.

## Rules

- **Same structure.** Do not add or remove top-level sections. The output must have the same headings as the draft.
- **Same rigor.** Same level of detail per evaluation. If the draft scored tools on 6 criteria, the final scores on 6 criteria.
- **Evidence over assertion.** Where the research provides benchmarks or data, cite it. Where it contradicts the draft, fix the draft.
- **Still honest about the original.** The deep research may reveal that the original's stack problems are even worse (or less bad) than we thought. Update accordingly.
- **Use the product name.** Use "{productName}" wherever the product is referenced by name.
- **Version-pin everything.** Update version recommendations if the research reveals newer stable versions or version-specific issues.
- **Banned words:** revolutionary, powerful, seamless, robust, cutting-edge, next-generation, best-in-class, blazing-fast, game-changing, disruptive, leverage.

## Output

Output only raw markdown. No YAML frontmatter. No preamble, no explanation, no commentary outside the document structure.
