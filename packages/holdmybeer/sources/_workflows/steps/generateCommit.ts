import { text } from "@text";
import { generate } from "@/_workflows/steps/generate.js";
import type { Context } from "@/types";

export interface GenerateCommitOptions {
    hint?: string;
    showProgress?: boolean;
}

const promptTemplate = [
    "Generate one Angular-style git commit message.",
    "Return a single line only.",
    "{{hint}}"
].join("\n");

/**
 * Generates a single-line Angular-style commit message.
 * Expects: optional hint string to guide the commit message content.
 */
export async function generateCommit(
    ctx: Context,
    options: GenerateCommitOptions = {}
): Promise<{ provider?: string; text: string }> {
    const hint = options.hint ? `Context: ${options.hint}` : "";
    const result = await generate(
        ctx,
        promptTemplate,
        { hint },
        {
            progressMessage: text.inference_commit_generating!,
            showProgress: options.showProgress,
            modelSelectionMode: "codex-high",
            expectedOutput: { type: "text" }
        }
    );
    const firstLine = result.text.split("\n")[0]?.trim();
    if (!firstLine) {
        throw new Error("Inference returned empty commit message.");
    }

    return {
        provider: result.provider,
        text: firstLine
    };
}
