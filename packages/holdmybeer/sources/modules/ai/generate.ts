import { readFile } from "node:fs/promises";
import { beerLogLine } from "@text";
import { type ProviderGenerateFailure, providerGenerate } from "@/modules/ai/providerGenerate.js";
import { providerModelSelect } from "@/modules/providers/providerModelSelect.js";
import { providerPriorityList } from "@/modules/providers/providerPriorityList.js";
import { sandboxInferenceGet } from "@/modules/sandbox/sandboxInferenceGet.js";
import type { InferenceWritePolicy } from "@/modules/sandbox/sandboxInferenceTypes.js";
import type {
    Context,
    GenerateEvent,
    GenerateProviderFailure,
    ProviderEvent,
    ProviderId,
    ProviderModelSelectionMode,
    ProviderTokenUsage
} from "@/types";

export interface GenerateResult {
    provider?: string;
    sessionId?: string;
    text: string;
}

export type GenerateExpectedTextOutputVerify = (output: { text: string }) => void | Promise<void>;
export type GenerateExpectedFileOutputVerify = (output: {
    text: string;
    filePath: string;
    fileContent: string;
}) => void | Promise<void>;
export type GenerateExpectedOutput =
    | { type: "text"; verify?: GenerateExpectedTextOutputVerify }
    | { type: "file"; filePath: string; verify?: GenerateExpectedFileOutputVerify };

export interface GeneratePermissions {
    sessionId?: string;
    providerPriority?: readonly ProviderId[];
    modelPriority?: readonly string[];
    modelSelectionMode?: ProviderModelSelectionMode;
    showProgress?: boolean;
    onEvent?: (event: GenerateEvent) => void;
    writePolicy?: InferenceWritePolicy;
    enableWeakerNetworkIsolation?: boolean;
    expectedOutput?: GenerateExpectedOutput;
}

interface GenerateOptions {
    onMessage?: (message: string) => void;
    onEvent?: (event: GenerateEvent) => void;
}

function inferMessage(message: string, options?: GenerateOptions): void {
    options?.onMessage?.(`[beer][infer] ${message}`);
}

function inferEvent(event: GenerateEvent, options?: GenerateOptions): void {
    options?.onEvent?.(event);
}

function inferOutputMessage(
    providerId: ProviderId,
    stream: "stdout" | "stderr",
    chunk: string,
    options?: GenerateOptions
): void {
    if (!options?.onMessage && !options?.onEvent) {
        return;
    }

    const lines = chunk
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

    for (const line of lines) {
        options.onMessage?.(`[beer][infer] ${providerId}:${stream} ${line}`);
        if (stream === "stderr") {
            inferEvent(
                {
                    type: "provider_stderr",
                    providerId,
                    text: line
                },
                options
            );
        }
    }
}

function inferProviderEvent(providerId: ProviderId, event: ProviderEvent, options?: GenerateOptions): void {
    inferEvent({ providerId, ...event }, options);
}

function inferProviderStatusEvent(
    event: {
        providerId: ProviderId;
        status: "selected" | "started" | "completed" | "failed";
        model?: string;
        sessionId?: string;
        exitCode?: number;
        tokens?: ProviderTokenUsage;
    },
    options?: GenerateOptions
): void {
    const detailParts: string[] = [];
    if (event.model) {
        detailParts.push(`model=${event.model}`);
    }
    if (event.sessionId) {
        detailParts.push(`session=${event.sessionId}`);
    }
    if (typeof event.exitCode === "number") {
        detailParts.push(`exit=${event.exitCode}`);
    }
    if (event.tokens) {
        detailParts.push(`tokens=${event.tokens.total}`);
    }
    const details = detailParts.length > 0 ? ` ${detailParts.join(" ")}` : "";
    inferMessage(`provider=${event.providerId} ${event.status}${details}`, options);
    inferEvent(
        {
            type: "provider_status",
            ...event
        },
        options
    );
}

function inferFailureForEvent(failure: ProviderGenerateFailure): GenerateProviderFailure {
    return {
        providerId: failure.providerId,
        exitCode: failure.exitCode,
        stderr: failure.stderr
    };
}

function inferPromptResolve(
    prompt: string,
    writePolicy: InferenceWritePolicy,
    expectedOutput: GenerateExpectedOutput
): string {
    return [inferSandboxPrompt(writePolicy), prompt, inferExpectedOutputPrompt(expectedOutput)].join("\n\n");
}

function inferSandboxPrompt(writePolicy: InferenceWritePolicy): string {
    if (writePolicy.mode === "read-only") {
        return [
            "Current sandbox parameters:",
            "- filesystem mode: read-only",
            "- writable paths: none",
            "- network: unrestricted",
            "- do not change files, run write operations, or apply edits"
        ].join("\n");
    }

    const writablePaths = writePolicy.writablePaths.map((entry) => entry.trim()).filter((entry) => entry.length > 0);
    const writableLine =
        writablePaths.length > 0 ? `- writable paths: ${writablePaths.join(", ")}` : "- writable paths: none";

    return [
        "Current sandbox parameters:",
        "- filesystem mode: write-whitelist",
        writableLine,
        "- network: unrestricted",
        "- do not write outside writable paths"
    ].join("\n");
}

function inferExpectedOutputPrompt(expectedOutput: GenerateExpectedOutput): string {
    if (expectedOutput.type === "file") {
        return [
            "Expected output:",
            `- create or update this file: ${expectedOutput.filePath}`,
            "- do not write to any other files",
            "- output tags are not required for this file-generation mode",
            "- optional: return a short plain-text confirmation"
        ].join("\n");
    }

    return [
        "Expected output:",
        "- return text only",
        "- return the final answer inside <output> and </output> tags only"
    ].join("\n");
}

/**
 * Runs inference through available providers.
 * Expects: prompt is plain task text; permissions define sandbox policy and expected output.
 */
export async function generate(
    context: Context,
    prompt: string,
    permissions: GeneratePermissions = {}
): Promise<GenerateResult> {
    const writePolicy: InferenceWritePolicy = permissions.writePolicy ?? { mode: "read-only" };
    const expectedOutput: GenerateExpectedOutput = permissions.expectedOutput ?? { type: "text" };
    const onMessage = permissions.showProgress
        ? (message: string) => {
              beerLogLine(message);
          }
        : undefined;
    const options: GenerateOptions = {
        onMessage,
        onEvent: permissions.onEvent
    };
    const sandbox = await sandboxInferenceGet({
        writePolicy,
        projectPath: context.projectPath,
        enableWeakerNetworkIsolation: permissions.enableWeakerNetworkIsolation
    });

    const promptResolved = inferPromptResolve(prompt, writePolicy, expectedOutput);
    const providerPriority = permissions.providerPriority ?? ["pi"];
    const prioritizedProviders = providerPriorityList(context.providers, providerPriority);
    const failures: ProviderGenerateFailure[] = [];

    for (const provider of prioritizedProviders) {
        if (!provider.command) {
            continue;
        }

        inferProviderStatusEvent(
            {
                providerId: provider.id,
                status: "selected"
            },
            options
        );
        const model = providerModelSelect({
            provider,
            modelPriority: permissions.modelPriority,
            mode: permissions.modelSelectionMode
        });
        inferProviderStatusEvent(
            {
                providerId: provider.id,
                status: "started",
                model
            },
            options
        );
        const result = await providerGenerate({
            providerId: provider.id,
            command: provider.command,
            model,
            prompt: promptResolved,
            sessionId: permissions.sessionId,
            projectPath: context.projectPath,
            sandbox,
            writePolicy,
            requireOutputTags: expectedOutput.type === "text",
            validateOutput: inferExpectedOutputVerifier(expectedOutput),
            onEvent: (event) => inferProviderEvent(provider.id, event, options),
            onStdoutText: (chunk) => inferOutputMessage(provider.id, "stdout", chunk, options),
            onStderrText: (chunk) => inferOutputMessage(provider.id, "stderr", chunk, options)
        });

        if (result.output !== null) {
            inferProviderStatusEvent(
                {
                    providerId: provider.id,
                    status: "completed",
                    sessionId: result.sessionId,
                    tokens: result.tokenUsage
                },
                options
            );
            const output: GenerateResult = {
                provider: provider.id,
                text: result.output
            };
            if (result.sessionId) {
                output.sessionId = result.sessionId;
            }
            return output;
        }

        if (result.failure) {
            inferProviderStatusEvent(
                {
                    providerId: provider.id,
                    status: "failed",
                    exitCode: result.failure.exitCode,
                    tokens: result.tokenUsage
                },
                options
            );
            failures.push(result.failure);
        }
    }

    inferMessage("all providers failed", options);
    inferEvent(
        {
            type: "all_providers_failed",
            failures: failures.map((entry) => inferFailureForEvent(entry))
        },
        options
    );
    const details = failures
        .map((entry) => {
            const suffix = entry.stderr ? `, stderr=${entry.stderr}` : "";
            return `${entry.providerId}(exit=${entry.exitCode}${suffix})`;
        })
        .join("; ");
    throw new Error(`Inference failed for all providers${details ? `: ${details}` : "."}`);
}

function inferExpectedOutputVerifier(
    expectedOutput: GenerateExpectedOutput
): ((output: string) => Promise<void>) | undefined {
    if (expectedOutput.type === "text") {
        const verify = expectedOutput.verify;
        if (!verify) {
            return undefined;
        }
        return async (text) => verify({ text });
    }

    const verify = expectedOutput.verify;
    if (!verify) {
        return undefined;
    }

    return async (text) => {
        const fileContent = await readFile(expectedOutput.filePath, "utf-8");
        await verify({
            text,
            filePath: expectedOutput.filePath,
            fileContent
        });
    };
}
