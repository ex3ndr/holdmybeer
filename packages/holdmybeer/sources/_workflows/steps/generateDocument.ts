import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { text } from "@text";
import { type GenerateFilePermissions, generateFile } from "@/modules/ai/generateFile.js";
import type { Context, ProviderModelSelectionMode } from "@/types";

export type GenerateDocumentPromptId = "PROMPT_RESEARCH" | "PROMPT_RESEARCH_PROBLEMS";

export interface GenerateDocumentInput {
    promptId: GenerateDocumentPromptId;
    outputPath: string;
    modelSelectionMode: ProviderModelSelectionMode;
}

export interface GenerateDocumentOptions extends Omit<GenerateFilePermissions, "verify"> {
    showProgress?: boolean;
    progressMessage?: string;
}

export interface GenerateDocumentResult {
    provider?: string;
    sessionId?: string;
    text: string;
    outputPath: string;
}

const promptsPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "../prompts");
const promptById: Record<GenerateDocumentPromptId, string> = {
    PROMPT_RESEARCH: readFileSync(path.join(promptsPath, "PROMPT_RESEARCH.md"), "utf-8"),
    PROMPT_RESEARCH_PROBLEMS: readFileSync(path.join(promptsPath, "PROMPT_RESEARCH_PROBLEMS.md"), "utf-8")
};

/**
 * Generates a document file from one of the workflow document prompt templates.
 * Expects: outputPath is project-relative or absolute and promptId maps to a prompt file.
 */
export async function generateDocument(
    ctx: Context,
    input: GenerateDocumentInput,
    options: GenerateDocumentOptions = {}
): Promise<GenerateDocumentResult> {
    const promptText = promptById[input.promptId];
    const outputPath = pathResolveInProject(ctx.projectPath, input.outputPath);
    const { showProgress, progressMessage, ...permissions } = options;
    const progressMessageResolved = progressMessage?.trim() || text.inference_research_document_generating!;

    const runGenerate = () =>
        generateFile(ctx, promptText, outputPath, {
            ...permissions,
            showProgress: false,
            modelSelectionMode: input.modelSelectionMode
        });
    const result = showProgress
        ? await ctx.progress(progressMessageResolved, async () => runGenerate())
        : await runGenerate();

    return {
        provider: result.provider,
        sessionId: result.sessionId,
        text: result.text,
        outputPath
    };
}

function pathResolveInProject(projectPath: string, outputFilePath: string): string {
    if (path.isAbsolute(outputFilePath)) {
        return path.resolve(outputFilePath);
    }
    return path.resolve(projectPath, outputFilePath);
}
