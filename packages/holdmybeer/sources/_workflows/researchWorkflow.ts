import { readFile } from "node:fs/promises";
import path from "node:path";
import { beerLogLine, text } from "@text";
import matter from "gray-matter";
import { z } from "zod";
import { type GenerateDocumentResult, generateDocument } from "@/_workflows/steps/generateDocument.js";
import { promptConfirm } from "@/modules/prompt/promptConfirm.js";
import type { Context } from "@/types";

const pitchFrontmatterSchema = z.object({
    deepResearchQuery: z.string().min(1)
});

const nameFrontmatterSchema = z.object({
    productName: z.string().min(1)
});

/**
 * Runs research, unresolved-problems, key-decisions, product pitch, and name generation.
 * Research and problems run in parallel; subsequent steps chain sequentially.
 */
export async function researchWorkflow(ctx: Context): Promise<void> {
    //
    // Run shallow research
    //

    const researchPromises: Promise<GenerateDocumentResult>[] = [];
    if (!(await ctx.existFile("doc/research.md"))) {
        researchPromises.push(
            generateDocument(
                ctx,
                {
                    promptId: "PROMPT_RESEARCH",
                    outputPath: "doc/research.md",
                    modelSelectionMode: "opus"
                },
                {
                    progressMessage: text.inference_research_summary_opus_generating!
                }
            )
        );
    }
    if (!(await ctx.existFile("doc/research-problems.md"))) {
        researchPromises.push(
            generateDocument(
                ctx,
                {
                    promptId: "PROMPT_RESEARCH_PROBLEMS",
                    outputPath: "doc/research-problems.md",
                    modelSelectionMode: "codex-xhigh"
                },
                {
                    progressMessage: text.inference_research_problems_codex_generating!
                }
            )
        );
    }
    await Promise.all(researchPromises);

    //
    // Generate key decisions (depends on research + problems)
    //

    let decisionsGenerated = false;
    if (!(await ctx.existFile("doc/decisions.md"))) {
        await generateDocument(
            ctx,
            {
                promptId: "PROMPT_DECISIONS",
                outputPath: "doc/decisions.md",
                modelSelectionMode: "opus",
                extraTemplateValues: {
                    researchPath: path.resolve(ctx.projectPath, "doc/research.md"),
                    unresolvedProblemsPath: path.resolve(ctx.projectPath, "doc/research-problems.md")
                }
            },
            {
                progressMessage: text.inference_research_decisions_generating!
            }
        );
        decisionsGenerated = true;
    }

    //
    // Generate draft product pitch (depends on research + problems + decisions)
    //

    let pitchGenerated = false;
    if (!(await ctx.existFile("doc/product-pitch.md"))) {
        const pitchResult = await generateDocument(
            ctx,
            {
                promptId: "PROMPT_PRODUCT_PITCH",
                outputPath: "doc/product-pitch.md",
                modelSelectionMode: "opus",
                extraTemplateValues: {
                    researchPath: path.resolve(ctx.projectPath, "doc/research.md"),
                    unresolvedProblemsPath: path.resolve(ctx.projectPath, "doc/research-problems.md"),
                    decisionsPath: path.resolve(ctx.projectPath, "doc/decisions.md")
                }
            },
            {
                progressMessage: text.inference_research_pitch_generating!,
                verify: ({ fileContent }) => {
                    if (!matter.test(fileContent)) {
                        throw new Error("Product pitch must include YAML frontmatter with deepResearchQuery");
                    }
                    const parsed = matter(fileContent);
                    const result = pitchFrontmatterSchema.safeParse(parsed.data);
                    if (!result.success) {
                        throw new Error(
                            `Invalid pitch frontmatter: ${result.error.issues.map((i) => i.message).join("; ")}`
                        );
                    }
                }
            }
        );
        pitchGenerated = true;

        // Extract and display deep research query from verified frontmatter
        const { deepResearchQuery } = matter(pitchResult.text).data as z.infer<typeof pitchFrontmatterSchema>;
        beerLogLine("");
        beerLogLine("🔍  Deep research query (use to validate and enrich this pitch):");
        beerLogLine("─".repeat(60));
        for (const line of deepResearchQuery.split("\n")) {
            beerLogLine(`  ${line}`);
        }
        beerLogLine("─".repeat(60));
        beerLogLine("");
    }

    //
    // Final product pitch: refine with deep research or copy draft
    //

    let pitchFinalGenerated = false;
    if (!(await ctx.existFile("doc/product-pitch-final.md"))) {
        const hasDeepResearch = await ctx.existFile("doc/product-pitch-deep-research-report.md");

        if (hasDeepResearch) {
            // Deep research report exists — refine the draft pitch
            await generateDocument(
                ctx,
                {
                    promptId: "PROMPT_PRODUCT_PITCH_FINAL",
                    outputPath: "doc/product-pitch-final.md",
                    modelSelectionMode: "opus",
                    extraTemplateValues: {
                        researchPath: path.resolve(ctx.projectPath, "doc/research.md"),
                        unresolvedProblemsPath: path.resolve(ctx.projectPath, "doc/research-problems.md"),
                        decisionsPath: path.resolve(ctx.projectPath, "doc/decisions.md"),
                        productPitchPath: path.resolve(ctx.projectPath, "doc/product-pitch.md"),
                        deepResearchReportPath: path.resolve(
                            ctx.projectPath,
                            "doc/product-pitch-deep-research-report.md"
                        )
                    }
                },
                {
                    progressMessage: text.inference_research_pitch_final_generating!,
                    verify: ({ fileContent }) => {
                        if (!matter.test(fileContent)) {
                            throw new Error("Final pitch must include YAML frontmatter with deepResearchQuery");
                        }
                        const parsed = matter(fileContent);
                        const result = pitchFrontmatterSchema.safeParse(parsed.data);
                        if (!result.success) {
                            throw new Error(
                                `Invalid final pitch frontmatter: ${result.error.issues.map((i) => i.message).join("; ")}`
                            );
                        }
                    }
                }
            );
            pitchFinalGenerated = true;
        } else {
            // No deep research — ask user whether to wait or skip
            const skipDeepResearch = await promptConfirm(text.prompt_deep_research_skip!, true);
            if (skipDeepResearch) {
                // Copy draft pitch as final
                const draftContent = await readFile(path.resolve(ctx.projectPath, "doc/product-pitch.md"), "utf-8");
                await ctx.writeFile("doc/product-pitch-final.md", draftContent);
                pitchFinalGenerated = true;
            } else {
                beerLogLine(
                    "⏸️  Stopping — place deep research report at doc/product-pitch-deep-research-report.md and re-run"
                );
                return;
            }
        }
    }

    //
    // Generate product name (depends on final pitch)
    //

    let nameGenerated = false;
    if (!ctx.settings.productName) {
        const nameResult = await generateDocument(
            ctx,
            {
                promptId: "PROMPT_PRODUCT_NAME",
                outputPath: "doc/product-name.md",
                modelSelectionMode: "opus",
                extraTemplateValues: {
                    researchPath: path.resolve(ctx.projectPath, "doc/research.md"),
                    decisionsPath: path.resolve(ctx.projectPath, "doc/decisions.md"),
                    productPitchPath: path.resolve(ctx.projectPath, "doc/product-pitch-final.md")
                }
            },
            {
                progressMessage: text.inference_research_name_generating!,
                verify: ({ fileContent }) => {
                    if (!matter.test(fileContent)) {
                        throw new Error("Product name document must include YAML frontmatter with productName");
                    }
                    const parsed = matter(fileContent);
                    const result = nameFrontmatterSchema.safeParse(parsed.data);
                    if (!result.success) {
                        throw new Error(
                            `Invalid name frontmatter: ${result.error.issues.map((i) => i.message).join("; ")}`
                        );
                    }
                }
            }
        );
        nameGenerated = true;

        // Extract name from verified frontmatter and save to settings
        const { productName } = matter(nameResult.text).data as z.infer<typeof nameFrontmatterSchema>;
        await ctx.applyConfig((settings) => {
            settings.productName = productName;
        });
        beerLogLine(`🏷️  Product name: ${productName}`);
    }

    //
    // Generate technology stack (depends on research + problems + decisions + final pitch)
    //

    let stackGenerated = false;
    if (!(await ctx.existFile("doc/technology-stack.md"))) {
        await generateDocument(
            ctx,
            {
                promptId: "PROMPT_TECHNOLOGY_STACK",
                outputPath: "doc/technology-stack.md",
                modelSelectionMode: "opus",
                extraTemplateValues: {
                    researchPath: path.resolve(ctx.projectPath, "doc/research.md"),
                    unresolvedProblemsPath: path.resolve(ctx.projectPath, "doc/research-problems.md"),
                    decisionsPath: path.resolve(ctx.projectPath, "doc/decisions.md"),
                    productPitchPath: path.resolve(ctx.projectPath, "doc/product-pitch-final.md")
                }
            },
            {
                progressMessage: text.inference_research_stack_generating!
            }
        );
        stackGenerated = true;
    }

    //
    // Checkpoint
    //

    if (
        researchPromises.length > 0 ||
        decisionsGenerated ||
        pitchGenerated ||
        pitchFinalGenerated ||
        nameGenerated ||
        stackGenerated
    ) {
        await ctx.checkpoint(`chore: research`);
    }

    //
    // Write AGENTS.md
    //
}
