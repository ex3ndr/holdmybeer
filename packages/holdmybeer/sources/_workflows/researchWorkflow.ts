import { text } from "@text";
import { type GenerateDocumentInput, generateDocument } from "@/_workflows/steps/generateDocument.js";
import type { Context } from "@/types";

const researchRuns: readonly (GenerateDocumentInput & { progressMessage: string })[] = [
    {
        promptId: "PROMPT_RESEARCH",
        outputPath: "doc/research.md",
        modelSelectionMode: "opus",
        progressMessage: text.inference_research_summary_opus_generating!
    },
    {
        promptId: "PROMPT_RESEARCH_PROBLEMS",
        outputPath: "doc/research-problems.md",
        modelSelectionMode: "codex-xhigh",
        progressMessage: text.inference_research_problems_codex_generating!
    }
];

/**
 * Runs research and unresolved-problems document generation in parallel.
 * Expects: bootstrap settings are already configured so prompt variables can be resolved.
 */
export async function researchWorkflow(ctx: Context): Promise<void> {
    await ctx.progresses(async (progresses) => {
        await Promise.all(
            researchRuns.map((run) => {
                const { progressMessage, ...input } = run;
                return progresses.run(progressMessage, async () => {
                    await generateDocument(ctx, input);
                });
            })
        );
    });
}
