import { randomUUID } from "node:crypto";
import path from "node:path";
import { aiOutputExtract } from "@/modules/ai/aiOutputExtract.js";
import { piProviderGenerate } from "@/modules/ai/providers/piProviderGenerate.js";
import type {
    PiProviderAssistantMessageEvent,
    PiProviderMessageUpdateEvent,
    PiProviderSessionEvent,
    PiProviderToolExecutionEvent
} from "@/modules/ai/providers/piProviderTypes.js";
import type { InferenceWritePolicy } from "@/modules/sandbox/sandboxInferenceTypes.js";
import type { CommandSandbox } from "@/modules/sandbox/sandboxTypes.js";
import { pathResolveFromInitCwd } from "@/modules/util/pathResolveFromInitCwd.js";
import type { ProviderEvent, ProviderId } from "@/types";

export interface ProviderGenerateInput {
    providerId: ProviderId;
    command: string;
    model?: string;
    prompt: string;
    projectPath?: string;
    sandbox: CommandSandbox;
    abortSignal?: AbortSignal;
    writePolicy?: InferenceWritePolicy;
    requireOutputTags?: boolean;
    validateOutput?: (output: string) => void | Promise<void>;
    outputValidationRetries?: number;
    onEvent?: (event: ProviderEvent) => void;
    onStdoutText?: (chunk: string) => void;
    onStderrText?: (chunk: string) => void;
}

export interface ProviderGenerateFailure {
    providerId: ProviderId;
    exitCode: number;
    stderr: string;
}

export interface ProviderGenerateResult {
    output: string | null;
    sessionId?: string;
    failure?: ProviderGenerateFailure;
}

const OUTPUT_RETRY_PROMPT =
    "Error: your previous response did not include <output> tags. Continue this session and return only <output>...</output>.";

/**
 * Runs provider inference through CLI and extracts response wrapped in <output> tags.
 * Expects: providerId is pi and command is executable.
 */
export async function providerGenerate(input: ProviderGenerateInput): Promise<ProviderGenerateResult> {
    const requireOutputTags = input.requireOutputTags ?? true;
    const outputValidationRetries = Math.max(0, input.outputValidationRetries ?? 10);
    const sessionDir = providerSessionDirResolve(input.projectPath);
    let sessionId: string | undefined;
    let prompt = input.prompt;
    let continueSession = false;
    let outputRetryUsed = false;
    let outputValidationRetryCount = 0;

    while (true) {
        const result = await piProviderGenerate({
            command: input.command,
            model: input.model,
            prompt,
            cwd: input.projectPath,
            sessionDir,
            continueSession,
            sandbox: input.sandbox,
            abortSignal: input.abortSignal,
            onEvent: (event) => {
                const providerEvent = providerEventResolve(input.providerId, event);
                if (providerEvent) {
                    if (providerEvent.type === "session_started") {
                        sessionId = providerEvent.sessionId;
                    }
                    input.onEvent?.(providerEvent);
                }
            },
            onStdoutText: input.onStdoutText,
            onStderrText: input.onStderrText
        });
        continueSession = true;

        if (result.exitCode !== 0) {
            return {
                output: null,
                sessionId,
                failure: {
                    providerId: input.providerId,
                    exitCode: result.exitCode,
                    stderr: result.stderr
                }
            };
        }

        const outputRaw = result.output;
        const output = providerOutputResolve(outputRaw, requireOutputTags);
        if (output.mode === "missing_json_output") {
            return {
                output: null,
                sessionId,
                failure: {
                    providerId: input.providerId,
                    exitCode: 1,
                    stderr: "Provider returned no JSON assistant output."
                }
            };
        }

        if (output.mode === "missing_output_tags") {
            if (outputRetryUsed) {
                return {
                    output: null,
                    sessionId,
                    failure: {
                        providerId: input.providerId,
                        exitCode: 1,
                        stderr: "Provider did not return <output> tags."
                    }
                };
            }
            outputRetryUsed = true;
            prompt = OUTPUT_RETRY_PROMPT;
            continue;
        }

        if (input.validateOutput) {
            try {
                await input.validateOutput(output.text);
            } catch (error) {
                if (outputValidationRetryCount >= outputValidationRetries) {
                    return {
                        output: null,
                        sessionId,
                        failure: {
                            providerId: input.providerId,
                            exitCode: 1,
                            stderr: `Output verification failed: ${providerErrorTextResolve(error)}`
                        }
                    };
                }
                outputValidationRetryCount += 1;
                prompt = providerOutputValidationRetryPromptResolve(error, requireOutputTags);
                continue;
            }
        }

        return { output: output.text, sessionId };
    }
}

function providerSessionDirResolve(projectPath: string | undefined): string {
    const sessionsRoot = projectPath
        ? path.resolve(projectPath, ".beer/local/sessions")
        : pathResolveFromInitCwd(".beer/local/sessions");
    return path.join(sessionsRoot, `${Date.now()}-${randomUUID()}`);
}

function providerEventResolve(providerId: ProviderId, event: unknown): ProviderEvent | undefined {
    if (providerId !== "pi") {
        return undefined;
    }
    return providerEventResolvePi(event);
}

function providerEventResolvePi(event: unknown): ProviderEvent | undefined {
    if (!event || typeof event !== "object") {
        return undefined;
    }

    const typed = event as { type?: unknown };
    const type = providerEventTokenResolve(typed.type);
    if (!type) {
        return undefined;
    }

    if (type === "session" || type === "session_start" || type === "session_started") {
        const sessionId = providerPiSessionIdResolve(event as PiProviderSessionEvent);
        return sessionId ? { type: "session_started", sessionId } : undefined;
    }

    if (type === "message_update") {
        return providerEventResolvePiMessageUpdate(event as PiProviderMessageUpdateEvent);
    }

    if (type === "tool_execution_start") {
        return {
            type: "tool_call_start",
            toolName: providerEventTokenResolve((event as PiProviderToolExecutionEvent).toolName)
        };
    }

    if (type === "tool_execution_end") {
        return {
            type: "tool_call_stop",
            toolName: providerEventTokenResolve((event as PiProviderToolExecutionEvent).toolName)
        };
    }

    return undefined;
}

function providerEventResolvePiMessageUpdate(event: PiProviderMessageUpdateEvent): ProviderEvent | undefined {
    const inner = event.assistantMessageEvent;
    if (!inner || typeof inner !== "object") {
        return undefined;
    }

    const innerType = providerEventTokenResolve(inner.type);
    if (!innerType) {
        return undefined;
    }

    if (innerType === "thinking_start" || innerType === "thought_start") {
        return { type: "thinking_start" };
    }

    if (innerType === "thinking_delta" || innerType === "thought_delta") {
        const delta = providerEventTokenResolve(inner.delta);
        return delta ? { type: "thinking_delta", delta } : undefined;
    }

    if (innerType === "thinking_stop" || innerType === "thinking_end" || innerType === "thought_end") {
        return { type: "thinking_stop" };
    }

    if (innerType === "toolcall_start") {
        return {
            type: "tool_call_start",
            toolName: providerEventResolvePiToolName(inner)
        };
    }

    if (innerType === "toolcall_end") {
        return {
            type: "tool_call_stop",
            toolName: providerEventResolvePiToolName(inner)
        };
    }

    if (innerType === "text_start") {
        return { type: "text_start" };
    }

    if (innerType === "text_delta") {
        const delta = providerEventTokenResolve(inner.delta);
        return delta ? { type: "text_delta", delta } : undefined;
    }

    if (innerType === "text_end" || innerType === "text_stop") {
        return { type: "text_stop" };
    }

    return undefined;
}

function providerPiSessionIdResolve(event: PiProviderSessionEvent): string | undefined {
    return (
        providerEventTokenResolve(event.sessionId) ??
        providerEventTokenResolve(event.session_id) ??
        providerEventTokenResolve(event.id)
    );
}

function providerEventResolvePiToolName(event: PiProviderAssistantMessageEvent): string | undefined {
    const toolCallName = providerEventTokenResolve(event.toolCall?.name);
    if (toolCallName) {
        return toolCallName;
    }

    const content = event.partial?.content;
    if (!Array.isArray(content) || content.length === 0) {
        return undefined;
    }

    const index = typeof event.contentIndex === "number" ? event.contentIndex : content.length - 1;
    const entry = content[index] as { name?: unknown } | undefined;
    return providerEventTokenResolve(entry?.name);
}

function providerEventTokenResolve(value: unknown): string | undefined {
    if (typeof value !== "string") {
        return undefined;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : undefined;
}

function providerOutputResolve(
    outputRaw: string | null,
    requireOutputTags: boolean
): { mode: "ok"; text: string } | { mode: "missing_json_output" } | { mode: "missing_output_tags" } {
    if (!outputRaw) {
        if (!requireOutputTags) {
            return { mode: "ok", text: "" };
        }
        return { mode: "missing_json_output" };
    }

    if (!requireOutputTags) {
        return { mode: "ok", text: outputRaw };
    }

    const extractedOutput = aiOutputExtract(outputRaw);
    if (extractedOutput) {
        return { mode: "ok", text: extractedOutput };
    }

    return { mode: "missing_output_tags" };
}

function providerOutputValidationRetryPromptResolve(error: unknown, requireOutputTags: boolean): string {
    const message = providerErrorTextResolve(error);
    const outputInstruction = requireOutputTags
        ? "Return only <output>...</output>."
        : "If useful, return short plain-text confirmation.";
    return [
        "Error: your previous response failed output verification.",
        `Verification error: ${message}`,
        "Continue this session and fix the result.",
        outputInstruction
    ].join(" ");
}

function providerErrorTextResolve(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
}
