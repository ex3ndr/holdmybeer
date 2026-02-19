import { text } from "@text";
import { generate } from "@/_workflows/steps/generate.js";
import type { Context, ProviderModelSelectionMode } from "@/types";

export interface GenerateCommitOptions {
    hint?: string;
    modelSelectionMode?: ProviderModelSelectionMode;
    progressMessage?: string;
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
): Promise<{ provider?: string; sessionId?: string; text: string }> {
    const hint = options.hint ? `Context: ${options.hint}` : "";
    const result = await generate(
        ctx,
        promptTemplate,
        { hint },
        {
            progressMessage: options.progressMessage ?? text.inference_commit_generating!,
            modelSelectionMode: options.modelSelectionMode ?? "codex-high",
            expectedOutput: { type: "text" }
        }
    );
    const firstLine = result.text.split("\n")[0]?.trim();
    if (!firstLine) {
        throw new Error("Inference returned empty commit message.");
    }

    return {
        provider: result.provider,
        sessionId: result.sessionId,
        text: firstLine
    };
}
