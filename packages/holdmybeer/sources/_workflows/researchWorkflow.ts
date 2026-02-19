import { readFile } from "node:fs/promises";
import path from "node:path";
import { beerLogLine, text } from "@text";
import matter from "gray-matter";
import { z } from "zod";
import { type GenerateDocumentResult, generateDocument } from "@/_workflows/steps/generateDocument.js";
import { promptConfirm } from "@/modules/prompt/promptConfirm.js";
import type { Context } from "@/types";

const deepResearchQuerySchema = z.object({
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
        await generateDocument(
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
                    const result = deepResearchQuerySchema.safeParse(parsed.data);
                    if (!result.success) {
                        throw new Error(
                            `Invalid pitch frontmatter: ${result.error.issues.map((i) => i.message).join("; ")}`
                        );
                    }
                }
            }
        );
        pitchGenerated = true;

        // Extract and display deep research query from the file on disk (result.text is model output, not file content)
        const pitchFileContent = await readFile(path.resolve(ctx.projectPath, "doc/product-pitch.md"), "utf-8");
        const { deepResearchQuery: pitchQuery } = matter(pitchFileContent).data as z.infer<
            typeof deepResearchQuerySchema
        >;
        beerLogLine("");
        beerLogLine("🔍  Deep research query (use to validate and enrich this pitch):");
        beerLogLine("─".repeat(60));
        for (const line of pitchQuery.split("\n")) {
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
                    progressMessage: text.inference_research_pitch_final_generating!
                }
            );
            pitchFinalGenerated = true;
        } else {
            // No deep research — ask user whether to wait or skip
            const skipDeepResearch = await promptConfirm(text.prompt_deep_research_skip!, true);
            if (skipDeepResearch) {
                // Copy draft pitch as final, stripping frontmatter
                const draftContent = await readFile(path.resolve(ctx.projectPath, "doc/product-pitch.md"), "utf-8");
                const { content } = matter(draftContent);
                await ctx.writeFile("doc/product-pitch-final.md", content.trimStart());
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
        await generateDocument(
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

        // Extract name from the file on disk (result.text is model output, not file content)
        const nameFileContent = await readFile(path.resolve(ctx.projectPath, "doc/product-name.md"), "utf-8");
        const { productName } = matter(nameFileContent).data as z.infer<typeof nameFrontmatterSchema>;
        await ctx.applyConfig((settings) => {
            settings.productName = productName;
        });
        beerLogLine(`🏷️  Product name: ${productName}`);
    }

    //
    // Generate draft technology stack (depends on research + problems + decisions + final pitch)
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
                progressMessage: text.inference_research_stack_generating!,
                verify: ({ fileContent }) => {
                    if (!matter.test(fileContent)) {
                        throw new Error("Technology stack must include YAML frontmatter with deepResearchQuery");
                    }
                    const parsed = matter(fileContent);
                    const result = deepResearchQuerySchema.safeParse(parsed.data);
                    if (!result.success) {
                        throw new Error(
                            `Invalid stack frontmatter: ${result.error.issues.map((i) => i.message).join("; ")}`
                        );
                    }
                }
            }
        );
        stackGenerated = true;

        // Extract and display deep research query from the file on disk (result.text is model output, not file content)
        const stackFileContent = await readFile(path.resolve(ctx.projectPath, "doc/technology-stack.md"), "utf-8");
        const { deepResearchQuery: stackQuery } = matter(stackFileContent).data as z.infer<
            typeof deepResearchQuerySchema
        >;
        beerLogLine("");
        beerLogLine("🔍  Deep research query (use to validate and enrich this stack):");
        beerLogLine("─".repeat(60));
        for (const line of stackQuery.split("\n")) {
            beerLogLine(`  ${line}`);
        }
        beerLogLine("─".repeat(60));
        beerLogLine("");
    }

    //
    // Final technology stack: refine with deep research or copy draft
    //

    let stackFinalGenerated = false;
    if (!(await ctx.existFile("doc/technology-stack-final.md"))) {
        const hasDeepResearch = await ctx.existFile("doc/technology-stack-deep-research-report.md");

        if (hasDeepResearch) {
            // Deep research report exists — refine the draft stack
            await generateDocument(
                ctx,
                {
                    promptId: "PROMPT_TECHNOLOGY_STACK_FINAL",
                    outputPath: "doc/technology-stack-final.md",
                    modelSelectionMode: "opus",
                    extraTemplateValues: {
                        researchPath: path.resolve(ctx.projectPath, "doc/research.md"),
                        unresolvedProblemsPath: path.resolve(ctx.projectPath, "doc/research-problems.md"),
                        decisionsPath: path.resolve(ctx.projectPath, "doc/decisions.md"),
                        productPitchPath: path.resolve(ctx.projectPath, "doc/product-pitch-final.md"),
                        technologyStackPath: path.resolve(ctx.projectPath, "doc/technology-stack.md"),
                        deepResearchReportPath: path.resolve(
                            ctx.projectPath,
                            "doc/technology-stack-deep-research-report.md"
                        )
                    }
                },
                {
                    progressMessage: text.inference_research_stack_final_generating!
                }
            );
            stackFinalGenerated = true;
        } else {
            // No deep research — ask user whether to wait or skip
            const skipDeepResearch = await promptConfirm(text.prompt_deep_research_stack_skip!, true);
            if (skipDeepResearch) {
                // Copy draft stack as final, stripping frontmatter
                const draftContent = await readFile(path.resolve(ctx.projectPath, "doc/technology-stack.md"), "utf-8");
                const { content } = matter(draftContent);
                await ctx.writeFile("doc/technology-stack-final.md", content.trimStart());
                stackFinalGenerated = true;
            } else {
                beerLogLine(
                    "⏸️  Stopping — place deep research report at doc/technology-stack-deep-research-report.md and re-run"
                );
                return;
            }
        }
    }

    //
    // Generate AGENTS.md and project blueprint in parallel
    // (both depend on all research + final pitch + final stack, but not on each other)
    //

    const finalDocTemplateValues = {
        researchPath: path.resolve(ctx.projectPath, "doc/research.md"),
        unresolvedProblemsPath: path.resolve(ctx.projectPath, "doc/research-problems.md"),
        decisionsPath: path.resolve(ctx.projectPath, "doc/decisions.md"),
        productPitchPath: path.resolve(ctx.projectPath, "doc/product-pitch-final.md"),
        technologyStackPath: path.resolve(ctx.projectPath, "doc/technology-stack-final.md")
    };

    let agentsMdGenerated = false;
    let blueprintGenerated = false;
    const finalDocPromises: Promise<void>[] = [];

    if (!(await ctx.existFile("AGENTS.md"))) {
        finalDocPromises.push(
            generateDocument(
                ctx,
                {
                    promptId: "PROMPT_AGENTS_MD",
                    outputPath: "AGENTS.md",
                    modelSelectionMode: "opus",
                    extraTemplateValues: finalDocTemplateValues
                },
                {
                    progressMessage: text.inference_research_agents_md_generating!
                }
            ).then(() => {
                agentsMdGenerated = true;
            })
        );
    }

    if (!(await ctx.existFile("doc/project-blueprint.md"))) {
        finalDocPromises.push(
            generateDocument(
                ctx,
                {
                    promptId: "PROMPT_PROJECT_BLUEPRINT",
                    outputPath: "doc/project-blueprint.md",
                    modelSelectionMode: "codex-xhigh",
                    extraTemplateValues: finalDocTemplateValues
                },
                {
                    progressMessage: text.inference_research_blueprint_generating!
                }
            ).then(() => {
                blueprintGenerated = true;
            })
        );
    }

    await Promise.all(finalDocPromises);

    //
    // Checkpoint
    //

    if (
        researchPromises.length > 0 ||
        decisionsGenerated ||
        pitchGenerated ||
        pitchFinalGenerated ||
        nameGenerated ||
        stackGenerated ||
        stackFinalGenerated ||
        agentsMdGenerated ||
        blueprintGenerated
    ) {
        await ctx.checkpoint(`chore: research`);
    }
}
