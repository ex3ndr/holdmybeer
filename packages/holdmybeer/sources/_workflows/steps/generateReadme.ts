import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { text, textFormat } from "@text";
import { generate } from "@/_workflows/steps/generate.js";
import type { Context } from "@/types";

export interface GenerateReadmeInput {
    sourceFullName: string;
    publishFullName: string;
    originalCheckoutPath: string;
}

export interface GenerateReadmeOptions {
    showProgress?: boolean;
}

const promptTemplate = readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), "../prompts/PROMPT_README.md"),
    "utf-8"
);

/**
 * Generates README markdown using sonnet-biased inference.
 * Expects: input fields are non-empty repository identifiers and checkout path.
 */
export async function generateReadme(
    ctx: Context,
    input: GenerateReadmeInput,
    options: GenerateReadmeOptions = {}
): Promise<string> {
    const prompt = textFormat(promptTemplate, {
        sourceFullName: input.sourceFullName,
        publishFullName: input.publishFullName,
        originalCheckoutPath: input.originalCheckoutPath
    });

    return `${(
        await generate(
            ctx,
            prompt,
            {},
            {
                progressMessage: text.bootstrap_readme_generating!,
                showProgress: options.showProgress,
                modelSelectionMode: "sonnet",
                writePolicy: { mode: "read-only" },
                expectedOutput: { type: "text" }
            }
        )
    ).text.trim()}\n`;
}
