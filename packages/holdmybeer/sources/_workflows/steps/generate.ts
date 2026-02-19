import { text } from "@text";
import { type GeneratePermissions, type GenerateResult, generate as generateAi } from "@/modules/ai/generate.js";
import type { Context, GenerateEvent } from "@/types";

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
    if (!permissionsBase.showProgress) {
        return generateAi(ctx, prompt, {
            ...permissionsBase,
            showProgress: false
        });
    }

    return ctx.progress(progressMessage, async (report) =>
        generateAi(ctx, prompt, {
            ...permissionsBase,
            showProgress: false,
            onEvent: (event: GenerateEvent) => {
                permissionsBase.onEvent?.(event);
                const updated = runInferenceProgressMessageResolve(progressMessage, event);
                if (updated) {
                    report(updated);
                }
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

/**
 * Returns an updated progress string when the event is user-meaningful, or null to keep the
 * current spinner text unchanged.
 */
function runInferenceProgressMessageResolve(baseMessage: string, event: GenerateEvent): string | null {
    const label = runInferenceEventHumanize(event);
    if (!label) {
        return null;
    }
    return `${baseMessage} (${label})`;
}

function runInferenceEventHumanize(event: GenerateEvent): string {
    switch (event.type) {
        case "provider_status":
            return event.status === "started" ? "starting" : "";
        case "thinking":
            return "thinking";
        case "tool_call":
            return event.toolName ? runInferenceToolHumanize(event.toolName) : "using tools";
        case "text":
            return "writing";
        case "usage":
            return `tokens ${event.tokens.total}`;
        default:
            return "";
    }
}

/** Maps PI tool names to short user-facing labels. */
function runInferenceToolHumanize(toolName: string): string {
    switch (toolName) {
        case "Read":
        case "read_file":
            return "reading files";
        case "Write":
        case "write_file":
            return "writing files";
        case "Edit":
        case "edit_file":
            return "editing files";
        case "Bash":
        case "bash":
        case "execute_command":
            return "running command";
        case "Grep":
        case "grep":
        case "search":
            return "searching code";
        case "Glob":
        case "glob":
        case "list_files":
            return "finding files";
        case "WebFetch":
        case "web_fetch":
            return "fetching web content";
        case "WebSearch":
        case "web_search":
            return "searching web";
        default:
            return `using ${toolName}`;
    }
}
