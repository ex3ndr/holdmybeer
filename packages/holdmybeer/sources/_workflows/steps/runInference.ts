import { text } from "@text";
import { stepProgressStart } from "@/_workflows/steps/stepProgressStart.js";
import { type GeneratePermissions, type GenerateResult, generate } from "@/modules/ai/generate.js";
import { contextGet } from "@/modules/context/contextGet.js";

export interface RunInferenceOptions extends GeneratePermissions {
    progressMessage: string;
}

/**
 * Runs inference with already initialized global context.
 * Expects: promptTemplate may include {{key}} placeholders from values and progressMessage is non-empty.
 */
export async function runInference(
    promptTemplate: string,
    values: Record<string, string | number> = {},
    options: RunInferenceOptions
): Promise<GenerateResult> {
    const progressMessage = options.progressMessage.trim();
    if (!progressMessage) {
        throw new Error(text.error_inference_progress_message_required!);
    }

    const { progressMessage: _progressMessage, ...permissionsBase } = options;
    const context = contextGet();
    const prompt = runInferencePromptResolve(promptTemplate, values);
    const progress = permissionsBase.showProgress ? stepProgressStart(progressMessage) : null;
    const permissions: GeneratePermissions = {
        ...permissionsBase,
        onEvent: (event: string) => {
            permissionsBase.onEvent?.(event);
            if (progress) {
                const updated = runInferenceProgressMessageResolve(progressMessage, event);
                if (updated) {
                    progress.update(updated);
                }
            }
        }
    };

    try {
        const result = await generate(context, prompt, permissions);
        progress?.done();
        return result;
    } catch (error) {
        progress?.fail();
        throw error;
    }
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
 * current spinner text unchanged. Only content-level events (thinking, writing, tool use)
 * produce visible updates; protocol-level events (turn/message start/end, selected, etc.)
 * are suppressed.
 */
function runInferenceProgressMessageResolve(baseMessage: string, event: string): string | null {
    const label = runInferenceEventHumanize(event);
    if (!label) {
        return null;
    }
    return `${baseMessage} (${label})`;
}

function runInferenceEventHumanize(event: string): string {
    const normalized = event.trim();
    if (!normalized) {
        return "";
    }

    const eventName = runInferenceEventTokenResolve(normalized, "event");
    if (eventName) {
        return runInferenceStreamEventHumanize(eventName, normalized);
    }

    // Status events without event= token (e.g. "provider=pi started")
    if (normalized.endsWith(" started")) {
        return "starting";
    }

    return "";
}

/** Maps PI event types to short user-facing labels. Handles both unwrapped
 * AssistantMessageEvent types and direct tool_execution events. */
function runInferenceStreamEventHumanize(eventName: string, rawEvent: string): string {
    switch (eventName) {
        case "text_start":
        case "text_delta":
        case "text_end":
            return "writing";
        case "thinking_start":
        case "thinking_delta":
        case "thinking_end":
            return "thinking";
        case "toolcall_start":
        case "toolcall_delta":
        case "toolcall_end":
        case "tool_execution_start":
        case "tool_execution_end": {
            const tool = runInferenceEventTokenResolve(rawEvent, "tool");
            return tool ? runInferenceToolHumanize(tool) : "using tools";
        }
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

function runInferenceEventTokenResolve(event: string, key: string): string | undefined {
    const match = event.match(new RegExp(`(?:^|\\s)${key}=([^\\s]+)`));
    return match?.[1];
}
