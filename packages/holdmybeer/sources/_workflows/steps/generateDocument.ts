import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { text } from "@text";
import { generateProgressMessageResolve } from "@/_workflows/steps/generateProgressMessageResolve.js";
import { type GenerateFilePermissions, generateFile } from "@/modules/ai/generateFile.js";
import type { Context, ProviderModelSelectionMode } from "@/types";

export type GenerateDocumentPromptId =
    | "PROMPT_RESEARCH"
    | "PROMPT_RESEARCH_PROBLEMS"
    | "PROMPT_DECISIONS"
    | "PROMPT_PRODUCT_PITCH"
    | "PROMPT_PRODUCT_PITCH_FINAL"
    | "PROMPT_PRODUCT_NAME"
    | "PROMPT_TECHNOLOGY_STACK";

export interface GenerateDocumentInput {
    promptId: GenerateDocumentPromptId;
    outputPath: string;
    modelSelectionMode: ProviderModelSelectionMode;
    /** Extra template values to substitute in the prompt (e.g. paths to prior documents). */
    extraTemplateValues?: Record<string, string>;
}

export interface GenerateDocumentOptions extends GenerateFilePermissions {
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
    PROMPT_RESEARCH_PROBLEMS: readFileSync(path.join(promptsPath, "PROMPT_RESEARCH_PROBLEMS.md"), "utf-8"),
    PROMPT_DECISIONS: readFileSync(path.join(promptsPath, "PROMPT_DECISIONS.md"), "utf-8"),
    PROMPT_PRODUCT_PITCH: readFileSync(path.join(promptsPath, "PROMPT_PRODUCT_PITCH.md"), "utf-8"),
    PROMPT_PRODUCT_PITCH_FINAL: readFileSync(path.join(promptsPath, "PROMPT_PRODUCT_PITCH_FINAL.md"), "utf-8"),
    PROMPT_PRODUCT_NAME: readFileSync(path.join(promptsPath, "PROMPT_PRODUCT_NAME.md"), "utf-8"),
    PROMPT_TECHNOLOGY_STACK: readFileSync(path.join(promptsPath, "PROMPT_TECHNOLOGY_STACK.md"), "utf-8")
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
    let progressTokenCount = 0;

    const runGenerate = (report?: (message: string) => void) =>
        generateFile(ctx, promptText, outputPath, {
            ...permissions,
            showProgress: false,
            modelSelectionMode: input.modelSelectionMode,
            extraTemplateValues: input.extraTemplateValues,
            onEvent: (event) => {
                permissions.onEvent?.(event);
                if (!report) {
                    return;
                }
                const updated = generateProgressMessageResolve(progressMessageResolved, event, progressTokenCount);
                progressTokenCount = updated.tokenCount;
                report(updated.message);
            }
        });
    // Progress defaults to on so document-generation workflows remain visible.
    const result =
        showProgress !== false
            ? await ctx.progress(`${progressMessageResolved} (starting, tokens 0)`, async (report) =>
                  runGenerate(report)
              )
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
