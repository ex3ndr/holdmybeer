import { beerLogLine } from "@text";
import type { GenerateResult } from "@/modules/ai/generate.js";
import { type ProviderGenerateFailure, providerGenerate } from "@/modules/ai/providerGenerate.js";
import { providerModelSelect } from "@/modules/providers/providerModelSelect.js";
import { providerPriorityList } from "@/modules/providers/providerPriorityList.js";
import { sandboxPassthrough } from "@/modules/sandbox/sandboxPassthrough.js";
import type {
    Context,
    GenerateEvent,
    GenerateProviderFailure,
    ProviderEvent,
    ProviderId,
    ProviderModelSelectionMode,
    ProviderTokenUsage
} from "@/types";

export interface GeneratePureTextPermissions {
    sessionId?: string;
    providerPriority?: readonly ProviderId[];
    modelPriority?: readonly string[];
    modelSelectionMode?: ProviderModelSelectionMode;
    showProgress?: boolean;
    onEvent?: (event: GenerateEvent) => void;
}

interface GeneratePureTextOptions {
    onMessage?: (message: string) => void;
    onEvent?: (event: GenerateEvent) => void;
}

function inferMessage(message: string, options?: GeneratePureTextOptions): void {
    options?.onMessage?.(`[beer][infer] ${message}`);
}

function inferEvent(event: GenerateEvent, options?: GeneratePureTextOptions): void {
    options?.onEvent?.(event);
}

function inferOutputMessage(
    providerId: ProviderId,
    stream: "stdout" | "stderr",
    chunk: string,
    options?: GeneratePureTextOptions
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

function inferProviderEvent(providerId: ProviderId, event: ProviderEvent, options?: GeneratePureTextOptions): void {
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
    options?: GeneratePureTextOptions
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

/**
 * Runs provider inference in pure mode (no tools/extensions/skills, raw prompt input).
 * Expects: prompt is final task text and provider setup is already configured by the caller.
 */
export async function generatePureText(
    context: Context,
    prompt: string,
    permissions: GeneratePureTextPermissions = {}
): Promise<GenerateResult> {
    const onMessage = permissions.showProgress
        ? (message: string) => {
              beerLogLine(message);
          }
        : undefined;
    const options: GeneratePureTextOptions = {
        onMessage,
        onEvent: permissions.onEvent
    };
    const sandbox = sandboxPassthrough();
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
            prompt,
            pure: true,
            sessionId: permissions.sessionId,
            projectPath: context.projectPath,
            sandbox,
            requireOutputTags: false,
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
