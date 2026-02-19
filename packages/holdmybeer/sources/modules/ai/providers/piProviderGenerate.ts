import { commandJSONL } from "@/modules/ai/providers/commandJSONL.js";
import type { PiProviderEvent } from "@/modules/ai/providers/piProviderTypes.js";
import type { CommandSandbox } from "@/modules/sandbox/sandboxTypes.js";

export interface PiProviderGenerateInput {
    command: string;
    model?: string;
    prompt: string;
    cwd?: string;
    sessionDir?: string;
    continueSession?: boolean;
    sandbox: CommandSandbox;
    abortSignal?: AbortSignal;
    onEvent?: (event: unknown) => void;
    onStdoutText?: (chunk: string) => void;
    onStderrText?: (chunk: string) => void;
}

export interface PiProviderGenerateResult {
    output: string | null;
    exitCode: number;
    stderr: string;
}

/**
 * Runs PI CLI in JSON mode and resolves the latest assistant message_end text.
 * Expects: PI emits JSONL events on stdout.
 */
export async function piProviderGenerate(input: PiProviderGenerateInput): Promise<PiProviderGenerateResult> {
    let finalAssistantText: string | undefined;

    const result = await commandJSONL({
        command: input.command,
        args: piProviderArgsResolve(input.prompt, input.model, input.sessionDir, input.continueSession),
        cwd: input.cwd,
        sandbox: input.sandbox,
        abortSignal: input.abortSignal,
        timeoutMs: null,
        onStdoutText: input.onStdoutText,
        onStderrText: input.onStderrText,
        onJsonlEvent: (event) => {
            input.onEvent?.(event);
            const text = piProviderAssistantText(event);
            if (typeof text === "string") {
                finalAssistantText = text;
            }
        }
    });

    const output = finalAssistantText?.trim();
    return {
        output: output && output.length > 0 ? output : null,
        exitCode: result.exitCode,
        stderr: result.stderr.trim()
    };
}

function piProviderArgsResolve(
    prompt: string,
    model: string | undefined,
    sessionDir: string | undefined,
    continueSession: boolean | undefined
): string[] {
    const args = ["--mode", "json", "--print"];
    if (sessionDir && sessionDir.trim().length > 0) {
        args.push("--session-dir", sessionDir.trim());
    }
    if (continueSession) {
        args.push("--continue");
    }
    if (model && model.trim().length > 0) {
        args.push("--model", model.trim());
    }
    args.push(prompt);
    return args;
}

function piProviderAssistantText(event: unknown): string | undefined {
    if (!event || typeof event !== "object") {
        return undefined;
    }

    const typed = event as PiProviderEvent;
    if (typed.type !== "message_end" || typed.message?.role !== "assistant") {
        return undefined;
    }

    return piProviderContentText(typed.message.content);
}

function piProviderContentText(content: unknown): string {
    if (!Array.isArray(content)) {
        return "";
    }

    return content
        .map((entry) => {
            if (!entry || typeof entry !== "object") {
                return "";
            }

            const typed = entry as { type?: unknown; text?: unknown };
            return typed.type === "text" && typeof typed.text === "string" ? typed.text : "";
        })
        .join("");
}
