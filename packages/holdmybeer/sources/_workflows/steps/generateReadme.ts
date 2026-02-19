import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { text, textFormat } from "@text";
import { generateFile } from "@/modules/ai/generateFile.js";
import type { Context } from "@/types";

export interface GenerateReadmeInput {
    sourceFullName: string;
    publishFullName: string;
    originalCheckoutPath: string;
}

export interface GenerateReadmeOptions {
    showProgress?: boolean;
}

export interface GenerateReadmeResult {
    provider?: string;
    sessionId?: string;
    text: string;
    readmePath: string;
}

const promptTemplate = readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), "../prompts/PROMPT_README.md"),
    "utf-8"
);

/**
 * Generates README.md at project root using sonnet-biased inference.
 * Expects: input fields are non-empty repository identifiers and checkout path.
 */
export async function generateReadme(
    ctx: Context,
    input: GenerateReadmeInput,
    options: GenerateReadmeOptions = {}
): Promise<GenerateReadmeResult> {
    const prompt = textFormat(promptTemplate, {
        sourceFullName: input.sourceFullName,
        publishFullName: input.publishFullName,
        originalCheckoutPath: input.originalCheckoutPath
    });
    const readmePath = path.resolve(ctx.projectPath, "README.md");
    const runGenerate = () =>
        generateFile(ctx, prompt, readmePath, {
            showProgress: false,
            modelSelectionMode: "sonnet",
            verify: ({ filePath, fileContent }) => generateReadmeVerify(readmePath, filePath, fileContent)
        });
    const result = options.showProgress
        ? await ctx.progress(text.bootstrap_readme_generating!, async () => runGenerate())
        : await runGenerate();

    return {
        provider: result.provider,
        sessionId: result.sessionId,
        text: result.text,
        readmePath
    };
}

function generateReadmeVerify(expectedReadmePath: string, filePath: string, fileContent: string): void {
    if (path.resolve(filePath) !== expectedReadmePath) {
        throw new Error(`README must be generated in project root: ${expectedReadmePath}`);
    }

    if (!fileContent.trim()) {
        throw new Error("README generation produced an empty file.");
    }
}
