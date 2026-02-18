import { providerPriorityList } from "../providers/providerPriorityList.js";
import type { ProviderDetection, ProviderId } from "../providers/providerTypes.js";
import type { CommandSandbox } from "../sandbox/sandboxTypes.js";
import { commandRun } from "../util/commandRun.js";

export interface AiTextGenerateResult {
  provider?: string;
  text: string;
}

export interface AiTextGenerateOptions {
  onMessage?: (message: string) => void;
  readOnly?: boolean;
  sandbox?: CommandSandbox;
}

function inferMessage(message: string, options?: AiTextGenerateOptions): void {
  options?.onMessage?.(`[beer][infer] ${message}`);
}

function inferOutputMessage(
  providerId: ProviderId,
  stream: "stdout" | "stderr",
  chunk: string,
  options?: AiTextGenerateOptions
): void {
  if (!options?.onMessage) {
    return;
  }

  const lines = chunk
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  for (const line of lines) {
    options.onMessage(`[beer][infer] ${providerId}:${stream} ${line}`);
  }
}

function inferPromptResolve(prompt: string, readOnly: boolean): string {
  if (!readOnly) {
    return prompt;
  }

  return [
    "Read-only mode is enabled. Do not change files, run write operations, or apply edits.",
    "Use read-only analysis only and return text output.",
    prompt
  ].join("\n\n");
}

/**
 * Runs a single provider CLI and returns stdout, or null on failure.
 */
async function providerGenerate(
  providerId: ProviderId,
  command: string,
  args: string[],
  options?: AiTextGenerateOptions
): Promise<string | null> {
  inferMessage(`provider=${providerId} started`, options);
  const result = await commandRun(command, args, {
    allowFailure: true,
    timeoutMs: 90_000,
    sandbox: options?.sandbox,
    onStdoutText: (chunk) => inferOutputMessage(providerId, "stdout", chunk, options),
    onStderrText: (chunk) => inferOutputMessage(providerId, "stderr", chunk, options)
  });
  const output = result.stdout.trim();
  if (result.exitCode === 0 && output) {
    inferMessage(`provider=${providerId} succeeded`, options);
    return output;
  }
  inferMessage(`provider=${providerId} exit=${result.exitCode}`, options);
  return null;
}

/**
 * Builds CLI args for a provider invocation.
 */
function providerArgs(providerId: ProviderId, prompt: string, readOnly: boolean): string[] {
  if (providerId === "claude") {
    // Allow read tools so the AI can analyze the codebase; the prompt
    // prefix and sandbox prevent writes.
    const readOnlyArgs = readOnly
      ? ["--allowedTools", "Read,Glob,Grep,Bash,WebFetch"]
      : [];
    return [...readOnlyArgs, "-p", prompt];
  }

  if (providerId === "codex") {
    const readOnlyArgs = readOnly ? ["--sandbox", "read-only"] : [];
    return [...readOnlyArgs, "-p", prompt];
  }

  return ["-p", prompt];
}

/**
 * Tries provider CLIs in order and returns the first generated text.
 */
export async function aiTextGenerate(
  providers: readonly ProviderDetection[],
  providerPriority: readonly ProviderId[],
  prompt: string,
  fallbackText: string,
  options?: AiTextGenerateOptions
): Promise<AiTextGenerateResult> {
  const readOnly = options?.readOnly ?? true;
  const promptResolved = inferPromptResolve(prompt, readOnly);
  const prioritizedProviders = providerPriorityList(providers, providerPriority);

  for (const provider of prioritizedProviders) {
    if (!provider.command) {
      continue;
    }

    inferMessage(`provider=${provider.id} selected`, options);
    const args = providerArgs(provider.id, promptResolved, readOnly);
    const output = await providerGenerate(provider.id, provider.command, args, {
      ...options,
      readOnly
    });

    if (output) {
      inferMessage(`provider=${provider.id} completed`, options);
      return {
        provider: provider.id,
        text: output
      };
    }
  }

  inferMessage("all providers failed, using fallback text", options);
  return { text: fallbackText };
}
