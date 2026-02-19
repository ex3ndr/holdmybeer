import { text } from "@text";
import { generateProgressMessageResolve } from "@/_workflows/steps/generateProgressMessageResolve.js";
import { type GeneratePermissions, type GenerateResult, generate as generateAi } from "@/modules/ai/generate.js";
import type { Context } from "@/types";

export interface RunInferenceOptions extends GeneratePermissions {
    progressMessage: string;
}

/**
 * Runs inference for a workflow step using the provided context.
 * Expects: promptTemplate may include {{key}} placeholders from values and progressMessage is non-empty.
 */
export async function generate(
    ctx: Context,
    promptTemplate: string,
    values: Record<string, string | number> = {},
    options: RunInferenceOptions
): Promise<GenerateResult> {
    const progressMessage = options.progressMessage.trim();
    if (!progressMessage) {
        throw new Error(text.error_inference_progress_message_required!);
    }

    const { progressMessage: _progressMessage, ...permissionsBase } = options;
    const prompt = runInferencePromptResolve(promptTemplate, values);
    // Progress is on by default so callers do not need to wire a separate wrapper.
    if (permissionsBase.showProgress === false) {
        return generateAi(ctx, prompt, {
            ...permissionsBase,
            showProgress: false
        });
    }

    let progressTokenCount = 0;
    return ctx.progress(`${progressMessage} (starting, tokens 0)`, async (report) =>
        generateAi(ctx, prompt, {
            ...permissionsBase,
            showProgress: false,
            onEvent: (event) => {
                permissionsBase.onEvent?.(event);
                const updated = generateProgressMessageResolve(progressMessage, event, progressTokenCount);
                progressTokenCount = updated.tokenCount;
                report(updated.message);
            }
        })
    );
}

function runInferencePromptResolve(template: string, values: Record<string, string | number>): string {
    return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match: string, key: string) => {
        if (values[key] === undefined) {
            return match;
        }
        return String(values[key]);
    });
}
