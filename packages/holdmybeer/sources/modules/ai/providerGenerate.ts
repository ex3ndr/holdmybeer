import { randomUUID } from "node:crypto";
import path from "node:path";
import { aiOutputExtract } from "@/modules/ai/aiOutputExtract.js";
import { piProviderGenerate } from "@/modules/ai/providers/piProviderGenerate.js";
import type {
    PiProviderAssistantMessageEvent,
    PiProviderMessage,
    PiProviderMessageEndEvent,
    PiProviderMessageUpdateEvent,
    PiProviderSessionEvent,
    PiProviderToolCallContent,
    PiProviderToolExecutionEvent
} from "@/modules/ai/providers/piProviderTypes.js";
import type { InferenceWritePolicy } from "@/modules/sandbox/sandboxInferenceTypes.js";
import type { CommandSandbox } from "@/modules/sandbox/sandboxTypes.js";
import { pathResolveFromInitCwd } from "@/modules/util/pathResolveFromInitCwd.js";
import type { ProviderEvent, ProviderId, ProviderTokenUsage } from "@/types";

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
    tokenUsage?: ProviderTokenUsage;
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
    let tokenUsage: ProviderTokenUsage | undefined;

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
                    if ("tokens" in providerEvent && providerEvent.tokens) {
                        tokenUsage = providerEvent.tokens;
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
                tokenUsage,
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
                tokenUsage,
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
                    tokenUsage,
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
                        tokenUsage,
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

        return { output: output.text, sessionId, tokenUsage };
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
    const type = providerEventTypeResolve(typed.type);
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

    if (type === "message_end" || type === "turn_end") {
        return providerEventResolvePiUsage(event as PiProviderMessageEndEvent);
    }

    if (type === "tool_execution_start") {
        return {
            type: "tool_call",
            status: "started",
            toolName: providerEventTokenResolve((event as PiProviderToolExecutionEvent).toolName)
        };
    }

    if (type === "tool_execution_end") {
        return {
            type: "tool_call",
            status: "stopped",
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

    const innerType = providerEventTypeResolve(inner.type);
    if (!innerType) {
        return undefined;
    }

    const status = providerEventResolvePiStreamStatus(innerType);
    if (!status) {
        return undefined;
    }
    const tokens = providerPiMessageUsageResolve(event.message);

    if (innerType.startsWith("thinking_") || innerType.startsWith("thought_")) {
        return {
            type: "thinking",
            status,
            text: providerEventResolvePiThinkingText(event.message, inner),
            tokens
        };
    }

    if (innerType.startsWith("toolcall_")) {
        const toolCall = providerEventResolvePiToolCall(event.message, inner);
        return {
            type: "tool_call",
            status,
            toolName: toolCall.toolName,
            toolCallId: toolCall.toolCallId,
            arguments: toolCall.arguments,
            partialJson: toolCall.partialJson,
            tokens
        };
    }

    if (innerType.startsWith("text_")) {
        return {
            type: "text",
            status,
            text: providerEventResolvePiText(event.message, inner),
            tokens
        };
    }

    return undefined;
}

function providerEventResolvePiUsage(event: PiProviderMessageEndEvent): ProviderEvent | undefined {
    const tokens = providerPiMessageUsageResolve(event.message);
    return tokens ? { type: "usage", tokens } : undefined;
}

function providerEventResolvePiStreamStatus(innerType: string): "started" | "updated" | "stopped" | undefined {
    if (innerType.endsWith("_start")) {
        return "started";
    }
    if (innerType.endsWith("_delta")) {
        return "updated";
    }
    if (innerType.endsWith("_end") || innerType.endsWith("_stop")) {
        return "stopped";
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

function providerEventResolvePiThinkingText(
    message: PiProviderMessage | undefined,
    event: PiProviderAssistantMessageEvent
): string {
    const content = providerPiContentResolve(message, event);
    const indexed = providerPiContentEntryResolve(content, event);
    const indexedText = providerPiThinkingTextResolve(indexed);
    if (indexedText !== undefined) {
        return indexedText;
    }

    for (const entry of content) {
        const text = providerPiThinkingTextResolve(entry);
        if (text !== undefined) {
            return text;
        }
    }

    return providerEventTokenResolve(event.delta) ?? "";
}

function providerEventResolvePiText(
    message: PiProviderMessage | undefined,
    event: PiProviderAssistantMessageEvent
): string {
    const content = providerPiContentResolve(message, event);
    const indexed = providerPiContentEntryResolve(content, event);
    const indexedText = providerPiTextResolve(indexed);
    if (indexedText !== undefined) {
        return indexedText;
    }

    for (const entry of content) {
        const text = providerPiTextResolve(entry);
        if (text !== undefined) {
            return text;
        }
    }

    return providerEventTokenResolve(event.delta) ?? "";
}

function providerEventResolvePiToolCall(
    message: PiProviderMessage | undefined,
    event: PiProviderAssistantMessageEvent
): {
    toolName?: string;
    toolCallId?: string;
    arguments?: unknown;
    partialJson?: string;
} {
    const fromToolCall = providerPiToolCallResolve(event.toolCall);
    const content = providerPiContentResolve(message, event);
    const indexed = providerPiContentEntryResolve(content, event);
    const fromIndexed = providerPiToolCallResolve(indexed);
    const fromAny = providerPiToolCallResolveFromContent(content);

    return {
        toolName: fromToolCall.toolName ?? fromIndexed.toolName ?? fromAny.toolName,
        toolCallId: fromToolCall.toolCallId ?? fromIndexed.toolCallId ?? fromAny.toolCallId,
        arguments: fromToolCall.arguments ?? fromIndexed.arguments ?? fromAny.arguments,
        partialJson: fromToolCall.partialJson ?? fromIndexed.partialJson ?? fromAny.partialJson
    };
}

function providerPiContentResolve(
    message: PiProviderMessage | undefined,
    event: PiProviderAssistantMessageEvent
): unknown[] {
    if (Array.isArray(message?.content)) {
        return message.content;
    }
    if (Array.isArray(event.partial?.content)) {
        return event.partial.content;
    }
    return [];
}

function providerPiContentEntryResolve(
    content: unknown[],
    event: PiProviderAssistantMessageEvent
): unknown | undefined {
    if (content.length === 0) {
        return undefined;
    }
    const indexRaw = event.contentIndex;
    if (typeof indexRaw === "number" && Number.isInteger(indexRaw) && indexRaw >= 0 && indexRaw < content.length) {
        return content[indexRaw];
    }
    return content[content.length - 1];
}

function providerPiThinkingTextResolve(entry: unknown): string | undefined {
    if (!entry || typeof entry !== "object") {
        return undefined;
    }
    const typed = entry as { type?: unknown; thinking?: unknown };
    const type = providerEventTypeResolve(typed.type);
    if (type !== "thinking" && type !== "thought") {
        return undefined;
    }
    return providerEventTokenResolve(typed.thinking) ?? "";
}

function providerPiTextResolve(entry: unknown): string | undefined {
    if (!entry || typeof entry !== "object") {
        return undefined;
    }
    const typed = entry as { type?: unknown; text?: unknown };
    const type = providerEventTypeResolve(typed.type);
    if (type !== "text") {
        return undefined;
    }
    return providerEventTokenResolve(typed.text) ?? "";
}

function providerPiToolCallResolve(entry: unknown): {
    toolName?: string;
    toolCallId?: string;
    arguments?: unknown;
    partialJson?: string;
} {
    if (!entry || typeof entry !== "object") {
        return {};
    }
    const typed = entry as PiProviderToolCallContent;
    const type = providerEventTypeResolve(typed.type);
    const toolName = providerEventTokenResolve(typed.name);
    if (type && type !== "toolcall") {
        return toolName ? { toolName } : {};
    }
    return {
        toolName,
        toolCallId: providerEventTokenResolve(typed.id),
        arguments: typed.arguments,
        partialJson: providerEventTokenResolve(typed.partialJson)
    };
}

function providerPiToolCallResolveFromContent(content: unknown[]): {
    toolName?: string;
    toolCallId?: string;
    arguments?: unknown;
    partialJson?: string;
} {
    for (let index = content.length - 1; index >= 0; index -= 1) {
        const resolved = providerPiToolCallResolve(content[index]);
        if (resolved.toolName || resolved.toolCallId || resolved.arguments !== undefined || resolved.partialJson) {
            return resolved;
        }
    }
    return {};
}

function providerPiMessageUsageResolve(message: PiProviderMessage | undefined): ProviderTokenUsage | undefined {
    return providerPiUsageResolve(message?.usage);
}

function providerPiUsageResolve(usage: unknown): ProviderTokenUsage | undefined {
    if (!usage || typeof usage !== "object") {
        return undefined;
    }

    const typed = usage as {
        input?: unknown;
        output?: unknown;
        cacheRead?: unknown;
        cacheWrite?: unknown;
        totalTokens?: unknown;
    };
    const input = providerNumberResolve(typed.input) ?? 0;
    const output = providerNumberResolve(typed.output) ?? 0;
    const cacheRead = providerNumberResolve(typed.cacheRead) ?? 0;
    const cacheWrite = providerNumberResolve(typed.cacheWrite) ?? 0;
    const total = providerNumberResolve(typed.totalTokens) ?? input + output + cacheRead + cacheWrite;

    if (input === 0 && output === 0 && cacheRead === 0 && cacheWrite === 0 && total === 0) {
        return undefined;
    }

    return {
        input,
        output,
        cacheRead,
        cacheWrite,
        total
    };
}

function providerNumberResolve(value: unknown): number | undefined {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return undefined;
    }
    return value;
}

function providerEventTypeResolve(value: unknown): string | undefined {
    const token = providerEventTokenResolve(value);
    return token ? token.toLowerCase() : undefined;
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
